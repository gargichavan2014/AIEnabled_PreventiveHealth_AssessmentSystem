(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AssessmentDomain = api;
}(globalThis, function () {
  function hasValue(value) {
    return String(value ?? "").trim() !== "";
  }

  function toNumberOrNull(value) {
    if (!hasValue(value)) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function calculateBMI(heightCm, weightKg) {
    const height = toNumberOrNull(heightCm);
    const weight = toNumberOrNull(weightKg);
    if (height === null || weight === null || height <= 0 || weight <= 0) return null;
    return weight / ((height / 100) ** 2);
  }

  function interpretBMI(bmi, age) {
    if (bmi === null || !Number.isFinite(Number(bmi))) {
      return "Not calculated — enter both height and weight.";
    }
    if (!hasValue(age)) {
      return "BMI calculated; age is needed to select an appropriate reference. No category assigned.";
    }
    const years = Number(age);
    if (!Number.isFinite(years)) {
      return "Age could not be interpreted; no BMI category assigned.";
    }
    if (years < 2) {
      return "For children under 2, use weight-for-length/height growth standards; no BMI category assigned.";
    }
    if (years < 20) {
      return "For ages 2–19, BMI requires age- and sex-specific growth-chart interpretation. This prototype does not calculate a percentile or z-score.";
    }
    if (bmi < 18.5) return "Adult BMI screening reference: underweight (CDC); not a diagnosis.";
    if (bmi < 25) return "Adult BMI screening reference: healthy-weight range (CDC); not a diagnosis.";
    if (bmi < 30) return "Adult BMI screening reference: overweight range (CDC); not a diagnosis.";
    return "Adult BMI screening reference: obesity range (CDC); not a diagnosis.";
  }

  function normalizePatientId(value) {
    return String(value ?? "").trim().toUpperCase();
  }

  function validateAssessment(input, { requireReview = false } = {}) {
    const errors = [];
    if (!normalizePatientId(input.patientId)) errors.push("Enter a patient ID.");
    if (!String(input.patientName ?? "").trim()) errors.push("Enter a patient label.");
    if (!String(input.date ?? "").trim()) errors.push("Choose an assessment date.");
    if (!input.imageDataUrl) errors.push("Add a tongue image before saving.");
    if (!input.consent) errors.push("Confirm demo consent before saving.");
    if (requireReview && !String(input.reviewer ?? "").trim()) {
      errors.push("Enter the practitioner name to save a reviewed report.");
    }
    if (requireReview && !input.reviewed) {
      errors.push("Confirm practitioner review before saving a reviewed report.");
    }
    const numericFields = [
      ["age", "Age", 0, 130],
      ["heightCm", "Height", 30, 250],
      ["weightKg", "Weight", 1, 500],
      ["temperatureC", "Body temperature", 25, 45],
      ["heartRateBpm", "Heart rate", 20, 250],
      ["systolicMmHg", "Systolic blood pressure", 40, 300],
      ["diastolicMmHg", "Diastolic blood pressure", 20, 200],
      ["painScore", "Patient-reported pain score", 0, 10],
    ];
    for (const [field, label, min, max] of numericFields) {
      const value = input[field];
      if (!hasValue(value)) continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) {
        errors.push(`${label} must be between ${min} and ${max}.`);
      }
    }
    return errors;
  }

  function createAssessmentRecord(input, { reviewed = false, id, createdAt } = {}) {
    const timestamp = createdAt ?? new Date().toISOString();
    return {
      id: id ?? globalThis.crypto?.randomUUID?.() ?? `assessment-${Date.now()}`,
      patientId: normalizePatientId(input.patientId),
      patientName: String(input.patientName).trim(),
      date: input.date,
      isSynthetic: Boolean(input.isSynthetic),
      age: String(input.age ?? "").trim(),
      sex: String(input.sex ?? "").trim(),
      country: String(input.country ?? "").trim(),
      bmi: calculateBMI(input.heightCm, input.weightKg),
      createdAt: timestamp,
      captureSetting: String(input.captureSetting ?? ""),
      heightCm: String(input.heightCm ?? "").trim(),
      weightKg: String(input.weightKg ?? "").trim(),
      temperatureC: String(input.temperatureC ?? "").trim(),
      heartRateBpm: String(input.heartRateBpm ?? "").trim(),
      systolicMmHg: String(input.systolicMmHg ?? "").trim(),
      diastolicMmHg: String(input.diastolicMmHg ?? "").trim(),
      imageDataUrl: input.imageDataUrl,
      color: String(input.color ?? ""),
      coating: String(input.coating ?? ""),
      moisture: String(input.moisture ?? ""),
      shape: String(input.shape ?? ""),
      otherFeatures: String(input.otherFeatures ?? "").trim(),
      certainty: String(input.certainty ?? ""),
      symptoms: String(input.symptoms ?? "").trim(),
      symptomDuration: String(input.symptomDuration ?? "").trim(),
      painScore: String(input.painScore ?? "").trim(),
      dryMouth: String(input.dryMouth ?? "").trim(),
      hydration: String(input.hydration ?? "").trim(),
      medications: String(input.medications ?? "").trim(),
      preventiveContext: {
        tobacco: String(input.tobacco ?? "").trim(),
        alcohol: String(input.alcohol ?? "").trim(),
        oralHygiene: String(input.oralHygiene ?? "").trim(),
        dentalVisit: String(input.dentalVisit ?? "").trim(),
      },
      notes: String(input.notes ?? "").trim(),
      clinicalImpression: String(input.clinicalImpression ?? "").trim(),
      testsConsidered: String(input.testsConsidered ?? "").trim(),
      practitionerPlan: String(input.practitionerPlan ?? "").trim(),
      reviewer: reviewed ? String(input.reviewer).trim() : "",
      reviewedAt: reviewed ? timestamp : null,
    };
  }

  function getPatientTimeline(records, patientId) {
    const normalizedId = normalizePatientId(patientId);
    return records
      .filter((record) => normalizePatientId(record.patientId) === normalizedId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  function parseDurationDays(durationText) {
    const text = String(durationText ?? "").trim().toLowerCase();
    if (!text) return null;
    const match = text.match(/(\d+(?:\.\d+)?)\s*(day|d|week|wk|wks|weeks|month|mo|mos|months|year|yr|yrs|years)\b/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = match[2];
    if (unit.startsWith("d")) return amount;
    if (unit.startsWith("w")) return amount * 7;
    if (unit.startsWith("m")) return amount * 30;
    if (unit.startsWith("y")) return amount * 365;
    return null;
  }

  function hasKeyword(text, regex) {
    return regex.test(String(text ?? ""));
  }

  function getPediatricHrBounds(age) {
    if (age < 2) return [90, 160];
    if (age < 6) return [80, 130];
    if (age < 13) return [70, 115];
    return [60, 105];
  }

  function interpretVitals(record) {
    const age = toNumberOrNull(record.age);
    const temp = toNumberOrNull(record.temperatureC);
    const hr = toNumberOrNull(record.heartRateBpm);
    const sys = toNumberOrNull(record.systolicMmHg);
    const dia = toNumberOrNull(record.diastolicMmHg);
    const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);

    const flags = [];

    if (temp === null) {
      flags.push({ key: "temperature", label: "Body temperature", value: "Not recorded", status: "unrecorded", detail: "Temperature was not entered." });
    } else if (temp >= 39.0) {
      flags.push({ key: "temperature", label: "Body temperature", value: `${temp.toFixed(1)} °C`, status: "urgent", detail: "High-grade fever (≥39.0 °C); prompt evaluation for acute infection or systemic inflammation." });
    } else if (temp >= 38.0) {
      flags.push({ key: "temperature", label: "Body temperature", value: `${temp.toFixed(1)} °C`, status: "abnormal", detail: "Fever range (38.0–38.9 °C); correlate with infectious or inflammatory symptoms." });
    } else if (temp >= 37.5) {
      flags.push({ key: "temperature", label: "Body temperature", value: `${temp.toFixed(1)} °C`, status: "borderline", detail: "Mildly elevated temperature (37.5–37.9 °C); monitor trend." });
    } else if (temp < 35.0) {
      flags.push({ key: "temperature", label: "Body temperature", value: `${temp.toFixed(1)} °C`, status: "urgent", detail: "Hypothermia range (<35.0 °C); verify reading and assess urgently." });
    } else {
      flags.push({ key: "temperature", label: "Body temperature", value: `${temp.toFixed(1)} °C`, status: "normal", detail: "Within normal body temperature range (35.0–37.4 °C)." });
    }

    if (hr === null) {
      flags.push({ key: "heartRate", label: "Heart rate", value: "Not recorded", status: "unrecorded", detail: "Heart rate was not entered." });
    } else if (age !== null && age < 18) {
      const [minHr, maxHr] = getPediatricHrBounds(age);
      if (hr < 45 || hr > maxHr + 25) {
        flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "urgent", detail: `Markedly outside expected pediatric resting range (${minHr}–${maxHr} beats/min for age ${age}).` });
      } else if (hr < minHr || hr > maxHr) {
        flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "abnormal", detail: `Outside typical resting range for age ${age} (${minHr}–${maxHr} beats/min); correlate with fever, distress, or hydration.` });
      } else {
        flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "normal", detail: `Within expected resting range for age ${age} (${minHr}–${maxHr} beats/min).` });
      }
    } else if (hr > 120 || hr < 45) {
      flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "urgent", detail: hr > 120 ? "Marked tachycardia (>120 beats/min); urgent clinical review advised." : "Marked bradycardia (<45 beats/min); urgent clinical review advised." });
    } else if (hr > 100) {
      flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "abnormal", detail: "Tachycardia (>100 beats/min); consider fever, dehydration, anemia, pain, anxiety, or cardiovascular causes." });
    } else if (hr < 60) {
      flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "abnormal", detail: "Bradycardia (<60 beats/min); correlate with baseline fitness, conduction status, or rate-lowering medications." });
    } else {
      flags.push({ key: "heartRate", label: "Heart rate", value: `${hr} beats/min`, status: "normal", detail: "Within normal resting adult range (60–100 beats/min)." });
    }

    if (sys === null && dia === null) {
      flags.push({ key: "bloodPressure", label: "Blood pressure", value: "Not recorded", status: "unrecorded", detail: "Blood pressure was not entered." });
    } else {
      const bpLabel = `${sys ?? "—"} / ${dia ?? "—"} mmHg`;
      if (age !== null && age < 18) {
        if ((sys !== null && sys >= 140) || (dia !== null && dia >= 90)) {
          flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "abnormal", detail: "Elevated reading for pediatric age; verify with age-, sex-, and height-specific pediatric BP percentiles." });
        } else if (sys !== null && sys < 75) {
          flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "abnormal", detail: "Low systolic reading for pediatric age; assess hydration and perfusion." });
        } else {
          flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "normal", detail: "Pediatric BP recorded; interpret formally against age-, sex-, and height-specific percentile charts." });
        }
      } else if ((sys !== null && sys >= 180) || (dia !== null && dia >= 120)) {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "urgent", detail: "Hypertensive crisis range (≥180/120 mmHg); urgent medical evaluation required." });
      } else if ((sys !== null && sys >= 140) || (dia !== null && dia >= 90)) {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "abnormal", detail: "Stage 2 hypertension screening range (≥140/90 mmHg); confirm with repeat resting readings." });
      } else if ((sys !== null && sys >= 130) || (dia !== null && dia >= 80)) {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "borderline", detail: "Stage 1 hypertension screening range (130–139 / 80–89 mmHg); repeat resting BP and lifestyle review advised." });
      } else if (sys !== null && sys >= 120 && (dia === null || dia < 80)) {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "borderline", detail: "Elevated systolic blood pressure (120–129 / <80 mmHg); preventive monitoring advised." });
      } else if ((sys !== null && sys < 90) || (dia !== null && dia < 60)) {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "abnormal", detail: "Low blood pressure range (<90/60 mmHg); evaluate hydration, orthostatic symptoms, or acute illness." });
      } else {
        flags.push({ key: "bloodPressure", label: "Blood pressure", value: bpLabel, status: "normal", detail: "Within normal resting adult blood pressure range (<120/80 mmHg)." });
      }
    }

    if (bmi === null) {
      flags.push({ key: "bmi", label: "BMI", value: "Not calculated", status: "unrecorded", detail: "Enter both height and weight to calculate BMI." });
    } else if (age !== null && age >= 20) {
      let status = "normal";
      if (bmi < 18.5 || bmi >= 30) status = "abnormal";
      else if (bmi >= 25) status = "borderline";
      flags.push({ key: "bmi", label: "BMI", value: `${bmi.toFixed(1)} kg/m²`, status, detail: interpretBMI(bmi, age) });
    } else {
      flags.push({ key: "bmi", label: "BMI", value: `${bmi.toFixed(1)} kg/m²`, status: "borderline", detail: interpretBMI(bmi, age) });
    }

    return flags;
  }

  function addUnique(list, item) {
    if (item && !list.includes(item)) list.push(item);
  }

  function generateDiagnosticAssessment(record) {
    const age = toNumberOrNull(record.age);
    const temp = toNumberOrNull(record.temperatureC);
    const hr = toNumberOrNull(record.heartRateBpm);
    const sys = toNumberOrNull(record.systolicMmHg);
    const dia = toNumberOrNull(record.diastolicMmHg);
    const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);
    const pain = toNumberOrNull(record.painScore);
    const durationDays = parseDurationDays(record.symptomDuration);
    const preventive = record.preventiveContext ?? {};

    const color = String(record.color ?? "");
    const coating = String(record.coating ?? "");
    const moisture = String(record.moisture ?? "");
    const shape = String(record.shape ?? "");
    const certainty = String(record.certainty ?? "");
    const textContext = [record.otherFeatures, record.symptoms, record.hydration, record.notes].filter(Boolean).join(" ");
    const medText = String(record.medications ?? "");

    const vitalFlags = interpretVitals(record);
    const impressions = [];
    const tests = [];
    const carePlan = [];
    const suggestedDiet = [];

    const hasPaleTongue = color === "Appears pale";
    const hasRedTongue = color === "Appears red";
    const hasPurpleTongue = color === "Appears purple / dusky";
    const hasHeavyOrPatchyCoating = coating === "Thicker / more visible" || coating === "Patchy / uneven";
    const hasDryAppearance = moisture === "Appears dry" || record.dryMouth === "Patient reports yes";
    const hasShapeVariation = shape === "Visible variation noted";

    const mentionsLesion = hasKeyword(textContext, /\b(ulcer|lesion|lump|mass|bleed|bleeding|white patch|red patch|leukoplakia|erythroplakia|sore spot|nodule)\b/i);
    const mentionsInflammation = hasKeyword(textContext, /\b(fissure|crack|geographic|scallop|swollen|smooth|glossy|burn|burning|tingl|sore|painful)\b/i);
    const mentionsSystemicFatigue = hasKeyword(textContext, /\b(fatigue|tired|weak|weakness|dizzy|dizziness|lightheaded|shortness of breath|breathless)\b/i);
    const mentionsDehydration = hasKeyword(textContext, /\b(dehydrat|thirst|dry|low intake|poor intake|vomit|diarrhea)\b/i);
    const usesSteroidOrAbx = hasKeyword(medText, /\b(antibiotic|amoxicillin|azithromycin|steroid|prednisone|inhaled|inhaler|budesonide|fluticasone|beclomethasone)\b/i);
    const usesXerostomicMed = hasKeyword(medText, /\b(antihistamine|diuretic|antidepressant|anticholinergic|metformin|amlodipine|lisinopril|beta.?blocker)\b/i);

    const hasTobaccoRisk = preventive.tobacco === "Patient reports current use";
    const hasFormerTobacco = preventive.tobacco === "Patient reports former use";
    const hasAlcoholRisk = preventive.alcohol === "Patient reports use";
    const hasSuboptimalHygiene = preventive.oralHygiene === "Brushes once daily or less";
    const lacksDentalCare = preventive.dentalVisit === "Reports no recent dental visit";

    // 1. Acute vital-sign emergencies / systemic flags
    const bpFlag = vitalFlags.find((f) => f.key === "bloodPressure");
    const tempFlag = vitalFlags.find((f) => f.key === "temperature");
    const hrFlag = vitalFlags.find((f) => f.key === "heartRate");
    const bmiFlag = vitalFlags.find((f) => f.key === "bmi");

    if (bpFlag && (bpFlag.status === "urgent" || bpFlag.status === "abnormal" || (bpFlag.status === "borderline" && ((sys !== null && sys >= 130) || (dia !== null && dia >= 80))))) {
      const isLowBp = (sys !== null && sys < 90) || (dia !== null && dia < 60);
      if (isLowBp) {
        impressions.push({
          title: "Hypotension / Volume Depletion Screening",
          likelihood: "High priority vital flag",
          matchedParameters: [bpFlag.value, hr > 100 ? `HR ${hr} bpm` : "", hasDryAppearance ? "Dry mucosa / dry mouth" : ""].filter(Boolean),
          rationale: "Blood pressure is below 90/60 mmHg; assess for dehydration, orthostatic hypotension, medication effect, or acute systemic illness.",
        });
        addUnique(tests, "Orthostatic vital signs, basic metabolic panel (electrolytes, renal function), and CBC.");
        addUnique(carePlan, "Assess hydration status and acute symptoms promptly; hold or review blood-pressure-lowering medications only under clinician direction.");
      } else {
        impressions.push({
          title: bpFlag.status === "urgent" ? "Severe Hypertension / Hypertensive Urgency Screening" : "Elevated Blood Pressure / Hypertension Risk",
          likelihood: bpFlag.status === "urgent" ? "Urgent attention" : "Moderate clinical relevance",
          matchedParameters: [bpFlag.value, age !== null ? `Age ${age}` : "", bmi !== null && bmi >= 25 ? `BMI ${bmi.toFixed(1)} kg/m²` : ""].filter(Boolean),
          rationale: bpFlag.detail,
        });
        addUnique(tests, "Repeat standardized resting blood pressure (both arms), home/ambulatory BP log, fasting lipid panel, HbA1c/fasting glucose, and basic metabolic panel.");
        addUnique(carePlan, bpFlag.status === "urgent"
          ? "Seek immediate medical evaluation for severely elevated blood pressure and screen for headache, chest pain, dyspnea, or neurological symptoms."
          : "Confirm elevated blood pressure on repeat visits; counsel on sodium reduction, DASH-style nutrition, regular physical activity, and tobacco/alcohol moderation.");
      }
    }

    if (temp !== null && (temp >= 37.5 || temp < 35.0)) {
      impressions.push({
        title: temp < 35.0 ? "Hypothermia Alert" : "Acute Febrile / Systemic Inflammatory Illness",
        likelihood: temp >= 39.0 || temp < 35.0 ? "Urgent attention" : "Moderate clinical relevance",
        matchedParameters: [
          `${temp.toFixed(1)} °C`,
          hr > 100 ? `HR ${hr} bpm` : "",
          hasHeavyOrPatchyCoating ? `Tongue coating: ${coating}` : "",
          record.symptoms ? `Symptoms: ${record.symptoms}` : "",
        ].filter(Boolean),
        rationale: temp < 35.0
          ? "Core temperature below 35.0 °C requires immediate verification and systemic evaluation."
          : "Elevated temperature alongside oral/systemic findings suggests an infectious or inflammatory process.",
      });
      addUnique(tests, "Focused infection workup (CBC with differential, CRP/ESR if clinically indicated, and site-directed cultures or rapid viral/bacterial testing).");
      addUnique(carePlan, "Ensure adequate fluid intake, monitor temperature trend, and seek urgent care if fever persists >48–72 hours or red-flag symptoms develop.");
    }

    // 2. High-priority oral mucosal lesion / dysplasia screening
    if ((mentionsLesion || hasShapeVariation) && ((durationDays !== null && durationDays >= 14) || hasTobaccoRisk || hasAlcoholRisk || (pain !== null && pain >= 6))) {
      impressions.push({
        title: "Persistent Oral Mucosal Lesion / Leukoplakia-Erythroplakia Differential",
        likelihood: (durationDays !== null && durationDays >= 14 && (hasTobaccoRisk || hasAlcoholRisk)) ? "High priority oral evaluation" : "Moderate clinical relevance",
        matchedParameters: [
          hasShapeVariation ? `Shape/surface: ${shape}` : "",
          record.otherFeatures ? `Features: ${record.otherFeatures}` : "",
          record.symptomDuration ? `Duration: ${record.symptomDuration}` : "",
          hasTobaccoRisk ? "Current tobacco/areca use" : "",
          hasAlcoholRisk ? "Alcohol use" : "",
        ].filter(Boolean),
        rationale: "Structural tongue surface variation, persistent lesions (≥2 weeks), or mucosal changes in the setting of tobacco/areca or alcohol exposure warrant direct intraoral examination to exclude premalignant or dysplastic pathology.",
      });
      addUnique(tests, "Comprehensive intraoral and neck lymph node examination; dental/oral medicine or ENT referral for toluidine blue / tissue biopsy if lesion persists beyond 14 days.");
      addUnique(carePlan, "Arrange timely dental or ENT specialist evaluation; strongly advise tobacco/areca and alcohol cessation.");
    }

    // 3. Anemia / Nutritional Deficiency (Iron, Folate, Vitamin B12)
    if (hasPaleTongue || (hasRedTongue && (mentionsInflammation || mentionsSystemicFatigue)) || (mentionsSystemicFatigue && (bmi !== null && bmi < 18.5))) {
      const triggers = [
        hasPaleTongue ? "Tongue color: Appears pale" : "",
        hasRedTongue ? "Tongue color: Appears red" : "",
        mentionsInflammation ? "Glossitis/surface or burning features noted" : "",
        mentionsSystemicFatigue ? "Systemic fatigue/dizziness reported" : "",
        hr !== null && hr > 100 ? `Tachycardia (${hr} bpm)` : "",
        bmi !== null && bmi < 18.5 ? `Underweight BMI (${bmi.toFixed(1)} kg/m²)` : "",
      ].filter(Boolean);

      impressions.push({
        title: "Suspected Anemia or Micronutrient Deficiency (Iron, Vitamin B12, Folate)",
        likelihood: triggers.length >= 2 ? "Moderate–High clinical correlation" : "Moderate clinical relevance",
        matchedParameters: triggers,
        rationale: hasPaleTongue
          ? "Mucosal pallor on tongue examination, particularly when paired with fatigue, tachycardia, or low BMI, commonly correlates with iron-deficiency or nutritional anemia."
          : "Beefy-red or inflamed tongue mucosa with soreness/burning or fatigue can reflect Vitamin B12, folate, or iron deficiency (atrophic glossitis).",
      });
      addUnique(tests, "Complete Blood Count (CBC) with MCV/RDW, peripheral blood smear, serum ferritin & iron/TIBC panel, Vitamin B12, and serum folate.");
      addUnique(carePlan, "Evaluate dietary intake and gastrointestinal/menstrual loss history; avoid empirical high-dose supplementation until lab confirmation.");
    }

    // 4. Oral Candidiasis / Coating Dysbiosis
    if (hasHeavyOrPatchyCoating && (hasDryAppearance || usesSteroidOrAbx || hasTobaccoRisk || (pain !== null && pain >= 2) || hasSuboptimalHygiene || hasKeyword(textContext, /\b(white|curd|scrap|thrush|yeast|fungal)\b/i))) {
      impressions.push({
        title: "Oral Candidiasis (Thrush) / Heavy Tongue Coating Dysbiosis",
        likelihood: (usesSteroidOrAbx || hasDryAppearance) ? "Moderate–High clinical correlation" : "Moderate clinical relevance",
        matchedParameters: [
          `Coating: ${coating}`,
          hasDryAppearance ? "Dry tongue / xerostomia" : "",
          usesSteroidOrAbx ? "Recent antibiotic or corticosteroid exposure" : "",
          hasTobaccoRisk ? "Current tobacco/areca use" : "",
          hasSuboptimalHygiene ? "Brushes once daily or less" : "",
        ].filter(Boolean),
        rationale: "Thickened or patchy tongue coating combined with dry mouth, steroid/antibiotic exposure, tobacco use, or reduced oral hygiene raises suspicion for oral candidal overgrowth or plaque/keratin accumulation.",
      });
      addUnique(tests, "Oral mucosal smear / KOH microscopy or fungal culture if plaques persist; fasting glucose or HbA1c to screen for underlying glycemic predisposition.");
      addUnique(carePlan, "Assess whether white coating wipes off on physical exam; optimize oral and tongue hygiene, rinse mouth after inhaled steroids, and consider targeted antifungal therapy if clinically confirmed.");
    } else if (hasHeavyOrPatchyCoating) {
      impressions.push({
        title: "Coated Tongue / Benign Plaque or Mild Dehydration Pattern",
        likelihood: "Low–Moderate clinical relevance",
        matchedParameters: [`Coating: ${coating}`, hasSuboptimalHygiene ? "Brushes once daily or less" : ""].filter(Boolean),
        rationale: "Increased or uneven tongue coating without severe mucosal pain or immunosuppression often reflects retained food/keratin debris, mouth breathing, or mild dehydration, though local fungal causes remain on the differential.",
      });
      addUnique(carePlan, "Encourage gentle twice-daily brushing, tongue cleaning, and adequate hydration; re-evaluate if coating persists or becomes symptomatic.");
    }

    // 5. Xerostomia / Dehydration
    if (hasDryAppearance || mentionsDehydration) {
      impressions.push({
        title: "Xerostomia (Dry Mouth) / Suboptimal Hydration Screening",
        likelihood: (moisture === "Appears dry" && record.dryMouth === "Patient reports yes") ? "High clinical correlation" : "Moderate clinical relevance",
        matchedParameters: [
          moisture === "Appears dry" ? "Visual appearance: Appears dry" : "",
          record.dryMouth === "Patient reports yes" ? "Patient reports dry mouth" : "",
          usesXerostomicMed ? "Potentially xerostomia-associated medication noted" : "",
          record.hydration ? `Hydration context: ${record.hydration}` : "",
        ].filter(Boolean),
        rationale: "Dry oral mucosa and subjective xerostomia impair oral clearance and increase risk for caries, candidiasis, and mucosal irritation; common contributors include dehydration, medication side effects, mouth breathing, or metabolic/autoimmune conditions.",
      });
      addUnique(tests, "Medication review for anticholinergic/xerostomic agents; fasting plasma glucose / HbA1c and basic metabolic panel if persistent.");
      addUnique(carePlan, "Increase water intake across the day, limit caffeine/alcohol/tobacco, use sugar-free xylitol lozenges or saliva substitutes if symptomatic, and ensure fluoride toothpaste use.");
    }

    // 6. Glossitis / Local Oral Irritation
    if ((hasRedTongue || mentionsInflammation || (pain !== null && pain >= 4)) && !impressions.some((item) => /Anemia|Lesion/i.test(item.title))) {
      impressions.push({
        title: "Glossitis / Acute Oral Mucosal Irritation",
        likelihood: (pain !== null && pain >= 4) ? "Moderate clinical correlation" : "Low–Moderate clinical relevance",
        matchedParameters: [
          hasRedTongue ? "Tongue color: Appears red" : "",
          pain !== null && pain > 0 ? `Pain score: ${pain}/10` : "",
          record.symptomDuration ? `Duration: ${record.symptomDuration}` : "",
          mentionsInflammation ? "Inflammatory/fissure/burning notes" : "",
        ].filter(Boolean),
        rationale: "Redness, soreness, burning, or surface fissuring can result from local mechanical/thermal irritation, spicy/acidic foods, allergic contact glossitis, or early nutritional/autoimmune mucosal inflammation.",
      });
      addUnique(tests, "Focused oral examination; consider nutritional panel (CBC, iron, B12, folate) if symptoms last >1–2 weeks.");
      addUnique(carePlan, "Avoid spicy, acidic, or tobacco irritants; maintain gentle oral hygiene and arrange follow-up if pain or redness does not resolve within 7–14 days.");
    }

    // 7. Dusky / Purple Tongue -> Cardiopulmonary / Perfusion Check
    if (hasPurpleTongue) {
      impressions.push({
        title: "Mucosal Cyanosis / Vascular Congestion Screening",
        likelihood: "Moderate–High clinical correlation",
        matchedParameters: [
          "Tongue color: Appears purple / dusky",
          hrFlag && hrFlag.status !== "normal" && hrFlag.status !== "unrecorded" ? `HR ${hr} bpm` : "",
          bpFlag && bpFlag.status !== "normal" && bpFlag.status !== "unrecorded" ? `BP ${bpFlag.value}` : "",
        ].filter(Boolean),
        rationale: "A dusky or purplish tongue appearance requires exclusion of hypoxemia, central/peripheral cyanosis, or venous congestion alongside lighting/artifact verification.",
      });
      addUnique(tests, "Pulse oximetry (SpO2), cardiopulmonary auscultation, and ECG/chest evaluation if clinically indicated.");
      addUnique(carePlan, "Check oxygen saturation promptly and correlate with respiratory symptoms (dyspnea, chest discomfort, or exercise intolerance).");
    }

    // 8. Cardiometabolic / BMI Screening (when adult BMI >= 25 or < 18.5 not already captured)
    if (bmi !== null && age !== null && age >= 20 && bmi >= 25) {
      impressions.push({
        title: bmi >= 30 ? "Obesity-Range Cardiometabolic Screening Risk" : "Overweight-Range Metabolic Preventive Risk",
        likelihood: "Screening indicator (CDC BMI)",
        matchedParameters: [`BMI ${bmi.toFixed(1)} kg/m²`, `Age ${age} years`, record.country || ""].filter(Boolean),
        rationale: interpretBMI(bmi, age),
      });
      addUnique(tests, "Fasting glucose / HbA1c and fasting lipid profile as part of routine cardiometabolic screening.");
      addUnique(carePlan, "Provide individualized nutrition and physical-activity counseling aligned with regional guidance (e.g., ICMR-NIN / WHO / CDC).");
    } else if (bmi !== null && age !== null && age >= 20 && bmi < 18.5 && !hasPaleTongue) {
      impressions.push({
        title: "Underweight Screening / Nutritional Reserve Review",
        likelihood: "Screening indicator (CDC BMI)",
        matchedParameters: [`BMI ${bmi.toFixed(1)} kg/m²`, `Age ${age} years`],
        rationale: interpretBMI(bmi, age),
      });
      addUnique(tests, "Basic nutritional and metabolic screen (CBC, albumin/protein, thyroid TSH) if unintentional weight loss is present.");
      addUnique(carePlan, "Screen for unintentional weight loss, dietary adequacy, and malabsorption.");
    }

    // 9. Preventive Oral Health Risk Profile
    if (hasTobaccoRisk || hasAlcoholRisk || hasSuboptimalHygiene || lacksDentalCare) {
      const riskItems = [
        hasTobaccoRisk ? "Current tobacco / areca nut use" : "",
        hasAlcoholRisk ? "Alcohol use reported" : "",
        hasSuboptimalHygiene ? "Brushes once daily or less" : "",
        lacksDentalCare ? "No recent routine dental visit" : "",
      ].filter(Boolean);
      impressions.push({
        title: "Elevated Preventive Oral & Periodontal Risk Profile",
        likelihood: "Preventive risk factor",
        matchedParameters: riskItems,
        rationale: "WHO and CDC identify tobacco/areca exposure, alcohol use, infrequent brushing, and missed routine dental care as primary modifiable drivers of periodontal disease, dental caries, and oral mucosal pathology.",
      });
      addUnique(carePlan, "Schedule a routine preventive dental examination and reinforce twice-daily fluoride brushing.");
      if (hasTobaccoRisk) addUnique(carePlan, "Offer structured tobacco / areca-nut cessation counseling and resources.");
      if (hasAlcoholRisk) addUnique(carePlan, "Discuss alcohol moderation as part of oral cancer and cardiometabolic risk reduction.");
    }

    // 10. Pain check if not already explained
    if (pain !== null && pain >= 7 && !impressions.some((i) => /Lesion|Glossitis|Febrile/i.test(i.title))) {
      impressions.push({
        title: "Severe Patient-Reported Pain Requiring Targeted Evaluation",
        likelihood: "High priority symptom",
        matchedParameters: [`Pain score: ${pain}/10`, record.symptoms || ""].filter(Boolean),
        rationale: "A patient-reported pain score of 7/10 or higher warrants prompt in-person clinical examination to identify the pain source.",
      });
    }

    // Determine data completeness and overall risk level
    const recordedCoreCount = [
      temp !== null,
      hr !== null,
      sys !== null || dia !== null,
      bmi !== null,
      Boolean(color && !/not assessed/i.test(color)),
      Boolean(coating && !/not assessed/i.test(coating)),
    ].filter(Boolean).length;

    const hasUrgentVital = vitalFlags.some((f) => f.status === "urgent");
    const hasAbnormalVital = vitalFlags.some((f) => f.status === "abnormal");
    const hasHighPriorityFinding = impressions.some((i) => /Urgent|High priority/i.test(i.likelihood));

    let riskLevel = "Low";
    if (hasUrgentVital || hasHighPriorityFinding || (pain !== null && pain >= 8)) {
      riskLevel = "Urgent";
    } else if (hasAbnormalVital || impressions.some((i) => /Moderate|High clinical/i.test(i.likelihood))) {
      riskLevel = "Moderate";
    } else if (recordedCoreCount < 2 && impressions.length === 0) {
      riskLevel = "Incomplete";
    }

    if (impressions.length === 0) {
      if (riskLevel === "Incomplete") {
        impressions.push({
          title: "Insufficient Clinical Parameters for Diagnostic Synthesis",
          likelihood: "Incomplete data",
          matchedParameters: ["Fewer than two core vitals or tongue observations recorded"],
          rationale: "Enter vital signs (temperature, heart rate, blood pressure, height/weight) and tongue visual observations so the system can generate parameter-based diagnostic impressions.",
        });
      } else {
        impressions.push({
          title: "Unremarkable Baseline Screening / No Acute Clinical Flags",
          likelihood: "Low risk baseline",
          matchedParameters: [
            ...vitalFlags.filter((f) => f.status === "normal").map((f) => `${f.label}: ${f.value}`),
            color && !/not assessed/i.test(color) ? `Color: ${color}` : "",
            coating && !/not assessed/i.test(coating) ? `Coating: ${coating}` : "",
          ].filter(Boolean),
          rationale: "Recorded vital signs, screening metrics, and tongue observations fall within expected baseline ranges without acute clinical red flags.",
        });
        addUnique(carePlan, "Continue routine preventive oral hygiene (twice-daily fluoride brushing), balanced nutrition, hydration, and scheduled dental checkups.");
      }
    }

    if (tests.length === 0) {
      addUnique(tests, "No urgent diagnostic laboratory or imaging tests triggered by current parameters; perform routine age-appropriate preventive screening as determined by clinician.");
    }

    if (carePlan.length === 0) {
      addUnique(carePlan, "Review all recorded observations in full clinical context and schedule routine preventive follow-up.");
    }

    // Personalized dietary & nutritional guidance based on entered parameters
    if (hasPaleTongue || (hasRedTongue && (mentionsInflammation || mentionsSystemicFatigue)) || (mentionsSystemicFatigue && bmi !== null && bmi < 18.5)) {
      addUnique(suggestedDiet, "Iron-, folate-, and Vitamin B12-rich foods: include leafy greens, lentils/pulses, beans, fortified grains, or eggs/fish/lean meats paired with Vitamin C sources (amla, citrus, bell peppers) for iron absorption; avoid tea or coffee within 1 hour of iron-rich meals.");
    }
    if (hasDryAppearance || mentionsDehydration) {
      addUnique(suggestedDiet, "Hydrating, moisture-supportive intake: target regular plain water throughout the day, include water-rich produce and broths/soups, and limit dehydrating caffeinated drinks (excess tea/coffee), alcohol, and very salty dry snacks.");
    }
    if ((pain !== null && pain >= 1) || mentionsInflammation || mentionsLesion || hasShapeVariation) {
      addUnique(suggestedDiet, "Soothing, non-irritating oral diet: choose soft, lukewarm, mildly seasoned foods (curd/yogurt, khichdi, oats, steamed vegetables, mashed legumes/tofu) and avoid spicy, acidic, crunchy, or very hot foods until tongue soreness resolves.");
    }
    if (hasHeavyOrPatchyCoating) {
      addUnique(suggestedDiet, "Low-free-sugar oral diet (WHO / CDC oral health guidance): limit free sugars, sweets, and sweetened drinks; choose plain water as the main drink and rinse mouth after meals.");
    }
    if (bpFlag && !((sys !== null && sys < 90) || (dia !== null && dia < 60)) && (bpFlag.status === "urgent" || bpFlag.status === "abnormal" || bpFlag.status === "borderline")) {
      addUnique(suggestedDiet, "Heart-healthy / DASH-aligned eating: limit added salt (<5 g/day), pickles, and ultra-processed foods; emphasize potassium- and fiber-rich vegetables, fruits, pulses, whole grains, and unsalted nuts.");
    }
    if (bmi !== null && age !== null && age >= 20 && bmi >= 25) {
      addUnique(suggestedDiet, "Balanced weight-management plate (CDC / WHO BMI screening context): fill half the plate with non-starchy vegetables, choose whole grains over refined carbs, keep adequate protein, and limit sugary drinks and fried foods.");
    } else if (bmi !== null && age !== null && age >= 20 && bmi < 18.5) {
      addUnique(suggestedDiet, "Nutrient-dense, energy-supportive meals (CDC / WHO underweight screening context): eat smaller, frequent meals combining complex carbohydrates, healthy fats (nuts, seeds), and protein-rich legumes, eggs, or fish.");
    }
    if (age !== null && age < 20) {
      addUnique(suggestedDiet, "Growth-supportive pediatric nutrition (WHO BMI-for-age 5–19y / CDC child BMI context): provide regular balanced meals with whole grains, protein sources, fruits, vegetables, and plain water; interpret growth using age- and sex-specific growth references.");
    }
    if (/\bindia\b/i.test(String(record.country ?? ""))) {
      addUnique(suggestedDiet, "Regional reference (India): consult the official ICMR–NIN Dietary Guidelines for Indians (2024) booklet (linked in References below) with a qualified practitioner for India-specific dietary guidance.");
    }
    if (suggestedDiet.length === 0) {
      addUnique(suggestedDiet, "Preventive oral & general nutrition (WHO / CDC): maintain a balanced diet low in free sugars, use plain water as the main drink, and avoid tobacco/excess alcohol.");
    }

    const caveats = [];
    if (!record.imageDataUrl) {
      caveats.push("No tongue photograph is attached; visual conclusions rely solely on text/dropdown entries.");
    }
    if (/low/i.test(certainty)) {
      caveats.push("Observation certainty is marked Low (lighting or image quality limitations); confirm findings by direct visual exam.");
    }
    if (age !== null && age < 20) {
      caveats.push("Pediatric patient (<20 years): BMI and blood pressure require age- and sex-specific growth/BP percentile charts.");
    }
    if (record.country) {
      caveats.push(`Country/region noted (${record.country}); interpret cardiometabolic and nutrition cutoffs with applicable regional guidelines.`);
    }

    const statusLabelMap = {
      Urgent: "Urgent Clinical Review",
      Moderate: "Findings Require Correlation",
      Low: "Baseline Unremarkable",
      Incomplete: "Insufficient Parameters",
    };

    const primaryHeadline = impressions.map((i) => i.title.split(" — ")[0].split(" (")[0]).slice(0, 2).join(" + ");
    const symptomSnippet = record.symptoms
      ? ` This aligns with the patient's reported concern ("${record.symptoms}"${record.symptomDuration ? ` for ${record.symptomDuration}` : ""}${pain !== null ? `, pain ${pain}/10` : ""}).`
      : "";
    const primarySummary = riskLevel === "Incomplete"
      ? "Enter vital signs, anthropometric measurements, and tongue observations to synthesize a parameter-driven diagnosis report."
      : `Diagnostic synthesis across all entered parameters identifies ${impressions.length} clinical finding(s): ${impressions.map((i) => i.title).join("; ")}.${symptomSnippet}`;

    const parameterEvaluations = [
      {
        domain: "Tongue Color",
        recordedValue: color || "Not assessed",
        status: !color || /not assessed/i.test(color) ? "Not assessed" : (color === "Appears pink" ? "Within expected range" : "Requires correlation"),
        tone: !color || /not assessed/i.test(color) ? "muted" : (color === "Appears pink" ? "ok" : "warn"),
        meaning: hasPaleTongue
          ? "Mucosal pallor noted; screen for iron/B12/folate deficiency or anemia."
          : hasRedTongue
            ? "Erythematous tongue noted; evaluate for glossitis, nutritional deficiency, or local irritation."
            : hasPurpleTongue
              ? "Dusky/purple hue noted; verify lighting and screen cardiopulmonary oxygenation/perfusion."
              : (color === "Appears pink" ? "Normal pink mucosal perfusion appearance." : "Record direct visual inspection alongside clinical lighting."),
      },
      {
        domain: "Tongue Coating",
        recordedValue: coating || "Not assessed",
        status: !coating || /not assessed/i.test(coating) ? "Not assessed" : (hasHeavyOrPatchyCoating ? "Abnormal coating" : "Within expected range"),
        tone: !coating || /not assessed/i.test(coating) ? "muted" : (hasHeavyOrPatchyCoating ? "warn" : "ok"),
        meaning: hasHeavyOrPatchyCoating
          ? "Thickened or patchy coating noted; evaluate for oral candidiasis, xerostomia, or retained debris."
          : (coating && !/not assessed/i.test(coating) ? "Minimal/physiological keratin and oral biofilm distribution." : "Coating not assessed."),
      },
      {
        domain: "Moisture & Dry Mouth",
        recordedValue: [moisture || "Not assessed", record.dryMouth ? `Dry mouth: ${record.dryMouth}` : ""].filter(Boolean).join(" / "),
        status: hasDryAppearance ? "Xerostomia signal" : ((!moisture || /not assessed|unable/i.test(moisture)) && !record.dryMouth ? "Not assessed" : "Adequate moisture"),
        tone: hasDryAppearance ? "warn" : ((!moisture || /not assessed|unable/i.test(moisture)) && !record.dryMouth ? "muted" : "ok"),
        meaning: hasDryAppearance
          ? "Consistent with mucosal dryness. Review reported medications for xerogenic side effects."
          : "No dry-mouth or mucosal desiccation signal reported.",
      },
      {
        domain: "Surface & Morphology",
        recordedValue: [shape || "Not assessed", record.otherFeatures ? record.otherFeatures : ""].filter(Boolean).join(" — "),
        status: (hasShapeVariation || mentionsLesion || mentionsInflammation) ? "Variation noted" : (!shape || /not assessed|unable/i.test(shape) ? "Not assessed" : "Unremarkable"),
        tone: mentionsLesion ? "urgent" : ((hasShapeVariation || mentionsInflammation) ? "warn" : (!shape || /not assessed|unable/i.test(shape) ? "muted" : "ok")),
        meaning: (hasShapeVariation || mentionsLesion || mentionsInflammation)
          ? "Morphological/surface variation recorded; inspect directly to distinguish benign fissuring/scalloping from focal lesions or ulceration."
          : "No focal lesion, ulceration, or structural surface abnormality noted.",
      },
      {
        domain: "Vital Signs",
        recordedValue: [
          temp !== null ? `Temp ${temp.toFixed(1)}°C` : "",
          (sys !== null || dia !== null) ? `BP ${sys ?? "—"}/${dia ?? "—"} mmHg` : "",
          hr !== null ? `HR ${hr} bpm` : "",
        ].filter(Boolean).join(" · ") || "Not recorded",
        status: hasUrgentVital ? "Urgent vital flag" : (hasAbnormalVital ? "Vital abnormality" : (bpFlag?.status === "borderline" || tempFlag?.status === "borderline" ? "Borderline / monitor" : (temp === null && hr === null && sys === null && dia === null ? "Not recorded" : "Normothermic / stable"))),
        tone: hasUrgentVital ? "urgent" : (hasAbnormalVital ? "warn" : (bpFlag?.status === "borderline" || tempFlag?.status === "borderline" ? "warn" : (temp === null && hr === null && sys === null && dia === null ? "muted" : "ok"))),
        meaning: [tempFlag, bpFlag, hrFlag].filter((f) => f && f.status !== "unrecorded").map((f) => `${f.label}: ${f.detail}`).join(" ") || "No vital signs recorded.",
      },
      {
        domain: "BMI & Anthropometry",
        recordedValue: bmi !== null ? `BMI ${bmi.toFixed(1)} kg/m² (${record.heightCm} cm, ${record.weightKg} kg)` : "Not calculated",
        status: bmiFlag?.status === "unrecorded" ? "Not calculated" : (bmiFlag?.status === "normal" ? "Healthy-weight screening range" : (bmi !== null && age !== null && age < 20 ? "Pediatric growth chart needed" : "Outside healthy-weight range")),
        tone: bmiFlag?.status === "unrecorded" ? "muted" : (bmiFlag?.status === "normal" ? "ok" : "warn"),
        meaning: `${interpretBMI(bmi, record.age)}${record.country ? ` Region recorded: ${record.country} (apply applicable national/ethnic thresholds clinically).` : ""}`,
      },
      {
        domain: "Symptoms & Pain",
        recordedValue: [
          record.symptoms || "None recorded",
          record.symptomDuration ? `Duration: ${record.symptomDuration}` : "",
          pain !== null ? `Pain: ${pain}/10` : "",
        ].filter(Boolean).join(" · "),
        status: pain !== null ? (pain >= 7 ? `Severe pain (${pain}/10)` : (pain >= 4 ? `Moderate pain (${pain}/10)` : (pain >= 1 ? `Mild pain (${pain}/10)` : "No pain (0/10)"))) : (record.symptoms ? "Symptoms reported" : "None recorded"),
        tone: pain !== null && pain >= 7 ? "urgent" : ((pain !== null && pain >= 1) || (durationDays !== null && durationDays >= 14) ? "warn" : (record.symptoms ? "ok" : "muted")),
        meaning: record.symptoms || pain !== null
          ? `Patient-reported presentation${record.symptomDuration ? ` over ${record.symptomDuration}` : ""}. ${pain !== null && pain > 0 ? `Pain intensity ${pain}/10 requires symptom relief & follow-up.` : "Correlate with clinical examination."}`
          : "No active oral or systemic symptoms documented.",
      },
      {
        domain: "Hydration & Medications",
        recordedValue: [
          record.hydration ? `Hydration: ${record.hydration}` : "",
          medText ? `Meds: ${medText}` : "",
        ].filter(Boolean).join(" · ") || "Not recorded",
        status: (usesSteroidOrAbx || usesXerostomicMed || mentionsDehydration) ? "Medication / hydration review" : ((record.hydration || medText) ? "Context recorded" : "Not recorded"),
        tone: (usesSteroidOrAbx || usesXerostomicMed || mentionsDehydration) ? "warn" : ((record.hydration || medText) ? "ok" : "muted"),
        meaning: medText || record.hydration
          ? `${medText ? `Verify "${medText}" for mucosal/salivary side effects.` : ""} ${record.hydration ? `Fluid context noted (${record.hydration}).` : ""}`.trim()
          : "No hydration history or current medications documented.",
      },
      {
        domain: "Preventive Risk Profile",
        recordedValue: [
          `Tobacco: ${preventive.tobacco || "Not discussed"}`,
          `Alcohol: ${preventive.alcohol || "Not discussed"}`,
          `Hygiene: ${preventive.oralHygiene || "Not discussed"}`,
          `Dental: ${preventive.dentalVisit || "Not discussed"}`,
        ].join(" · "),
        status: (hasTobaccoRisk || hasAlcoholRisk || hasSuboptimalHygiene || lacksDentalCare) ? "Preventive actions noted" : "Low preventive risk",
        tone: (hasTobaccoRisk || hasAlcoholRisk || hasSuboptimalHygiene || lacksDentalCare) ? "warn" : "ok",
        meaning: [
          hasTobaccoRisk ? "Tobacco/areca cessation counseling recommended." : "",
          hasAlcoholRisk ? "Alcohol moderation counseling advised." : "",
          hasSuboptimalHygiene ? "Reinforce twice-daily fluoride brushing." : "",
          lacksDentalCare ? "No recent dental visit — routine preventive dental checkup recommended." : "",
        ].filter(Boolean).join(" ") || "Preventive oral hygiene and lifestyle factors appear favorable.",
      },
    ];

    const riskSummaryMap = {
      Urgent: `Urgent clinical review recommended: ${impressions[0].title}.`,
      Moderate: `Moderate priority follow-up: ${impressions.map((i) => i.title).slice(0, 2).join("; ")}.`,
      Low: impressions[0].title,
      Incomplete: "More clinical parameters are needed to generate a complete diagnostic assessment.",
    };

    return {
      riskLevel,
      statusLabel: statusLabelMap[riskLevel],
      riskSummary: riskSummaryMap[riskLevel],
      primaryHeadline,
      primarySummary,
      primaryImpressions: impressions,
      parameterEvaluations,
      vitalFlags,
      recommendedTests: tests,
      carePlan,
      suggestedDiet,
      dataQualityNote: caveats.join(" ") || "Core parameters recorded with acceptable observation clarity; correlate with physical examination.",
      disclaimer: "This diagnosis report synthesizes the recorded tongue observations, vital signs, BMI screening calculation, patient-reported symptoms, medications, and preventive history using rule-based screening logic aligned with the repository's public-health references (WHO, CDC, ICMR-NIN). It is not a validated autonomous medical device and must be reviewed, confirmed, or modified by a qualified practitioner after direct patient examination.",
    };
  }

  function generateBatchDiagnosisReports(records, { liveOnly = true, latestPerPatient = true } = {}) {
    const sorted = (Array.isArray(records) ? records : [])
      .slice()
      .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    const filtered = liveOnly ? sorted.filter((record) => !record.isSynthetic) : sorted;
    const selected = [];
    const seenIds = new Set();
    for (const record of filtered) {
      const pid = normalizePatientId(record.patientId) || record.id;
      if (latestPerPatient && seenIds.has(pid)) continue;
      seenIds.add(pid);
      selected.push({
        record,
        diagnosis: generateDiagnosticAssessment(record),
      });
    }
    return selected;
  }

  function buildReportSections(record) {
    const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);
    const diagnosis = generateDiagnosticAssessment(record);
    const preventive = record.preventiveContext ?? {};

    const impressionLines = [
      `Priority / risk tier: ${diagnosis.riskLevel} — ${diagnosis.riskSummary}`,
      ...diagnosis.primaryImpressions.map((item, index) => (
        `${index + 1}. ${item.title} (${item.likelihood})\n   Parameters: ${item.matchedParameters.join(" · ") || "General context"}\n   Rationale: ${item.rationale}`
      )),
    ];

    const vitalLines = diagnosis.vitalFlags.map(
      (flag) => `${flag.label}: ${flag.value} [${flag.status.toUpperCase()}] — ${flag.detail}`,
    );

    return [
      { title: "Automated diagnostic assessment (parameter-based)", lines: impressionLines },
      { title: "Recommended investigations & diagnostic tests", lines: diagnosis.recommendedTests.map((t, i) => `${i + 1}. ${t}`) },
      { title: "Suggested care & preventive plan", lines: diagnosis.carePlan.map((step, i) => `${i + 1}. ${step}`) },
      { title: "Suggested diet & nutritional guidance", lines: diagnosis.suggestedDiet.map((item, i) => `${i + 1}. ${item}`) },
      { title: "Vital signs & clinical interpretation", lines: [
        `Height: ${record.heightCm ? `${record.heightCm} cm` : "Not recorded"}`,
        `Weight: ${record.weightKg ? `${record.weightKg} kg` : "Not recorded"}`,
        ...vitalLines,
      ] },
      { title: "Patient & visit", lines: [
        `Patient ID: ${record.patientId}`,
        `Patient label: ${record.patientName}`,
        `Assessment date: ${record.date}`,
        `Age: ${record.age ? `${record.age} years` : "Not recorded"}`,
        `Sex: ${record.sex || "Not recorded"}`,
        `Country / region: ${record.country || "Not recorded"}`,
        `Capture setting: ${record.captureSetting || "Not recorded"}`,
      ] },
      { title: "BMI screening summary", lines: [
        `BMI: ${bmi === null ? "Not calculated" : `${bmi.toFixed(1)} kg/m²`}`,
        interpretBMI(bmi, record.age),
        `Country / regional reference: ${record.country || "Not recorded"}; local or population-specific guidance was not selected automatically.`,
        "BMI is a screening measure and does not diagnose a condition; interpret alongside clinical history and examination.",
      ] },
      { title: "Visual observations", lines: [
        `Color: ${record.color || "Not assessed"}`,
        `Coating: ${record.coating || "Not assessed"}`,
        `Moisture appearance: ${record.moisture || "Not assessed"}`,
        `Shape / surface: ${record.shape || "Not assessed"}`,
        `Other visible features: ${record.otherFeatures || "None recorded"}`,
        `Observation certainty: ${record.certainty || "Not recorded"}`,
      ] },
      { title: "Patient-provided context", lines: [
        `Symptoms or concerns: ${record.symptoms || "Not recorded"}`,
        `Symptom duration: ${record.symptomDuration || "Not recorded"}`,
        `Pain score (patient-reported, 0–10): ${record.painScore || "Not recorded"}`,
        `Dry mouth (patient-reported): ${record.dryMouth || "Not discussed"}`,
        `Hydration / recent intake: ${record.hydration || "Not recorded"}`,
        `Medications / changes: ${record.medications || "Not recorded"}`,
      ] },
      { title: "Preventive context (patient-reported)", lines: [
        `Tobacco / areca use: ${preventive.tobacco || "Not discussed"}`,
        `Alcohol use: ${preventive.alcohol || "Not discussed"}`,
        `Oral hygiene routine: ${preventive.oralHygiene || "Not discussed"}`,
        `Dental visit: ${preventive.dentalVisit || "Not discussed"}`,
      ] },
      { title: "Clinician sign-off & overrides", lines: [
        `Clinical diagnosis / impression: ${record.clinicalImpression || "Pending clinician confirmation (see automated parameter findings)"}`,
        `Tests or investigations considered: ${record.testsConsidered || "Pending clinician selection"}`,
        `Practitioner plan / follow-up: ${record.practitionerPlan || "Pending clinician confirmation"}`,
        `Assessment caveats: ${diagnosis.dataQualityNote}`,
      ] },
      { title: "Practitioner notes", lines: [record.notes || "None recorded"] },
    ];
  }

  return {
    buildReportSections,
    calculateBMI,
    createAssessmentRecord,
    generateBatchDiagnosisReports,
    generateDiagnosticAssessment,
    getPatientTimeline,
    interpretBMI,
    interpretVitals,
    normalizePatientId,
    validateAssessment,
  };
}));
