(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AssessmentDomain = api;
}(globalThis, function () {
  function calculateBMI(heightCm, weightKg) {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!String(heightCm ?? "").trim() || !String(weightKg ?? "").trim()) return null;
    if (!Number.isFinite(height) || !Number.isFinite(weight) || height <= 0 || weight <= 0) return null;
    return weight / ((height / 100) ** 2);
  }

  function interpretBMI(bmi, age) {
    if (bmi === null || !Number.isFinite(Number(bmi))) {
      return "Not calculated — enter both height and weight.";
    }
    if (age === undefined || age === null || String(age).trim() === "") {
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
      if (value === undefined || value === null || String(value).trim() === "") continue;
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

  function buildAssessmentSummary(record) {
    const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);
    const patientDetails = [
      record.age ? `${record.age} years` : "",
      record.sex || "",
      record.country || "",
    ].filter(Boolean);
    const measurements = [
      record.temperatureC ? `temperature ${record.temperatureC} °C` : "",
      record.systolicMmHg || record.diastolicMmHg
        ? `blood pressure ${record.systolicMmHg || "—"} / ${record.diastolicMmHg || "—"} mmHg`
        : "",
      record.heartRateBpm ? `heart rate ${record.heartRateBpm} beats/min` : "",
    ].filter(Boolean);
    const observations = [
      record.color && !/not assessed/i.test(record.color) ? `color: ${record.color}` : "",
      record.coating && !/not assessed/i.test(record.coating) ? `coating: ${record.coating}` : "",
      record.moisture && !/not assessed|unable to assess/i.test(record.moisture) ? `moisture: ${record.moisture}` : "",
      record.shape && !/not assessed|unable to assess/i.test(record.shape) ? `shape/surface: ${record.shape}` : "",
      record.otherFeatures || "",
    ].filter(Boolean);
    const context = [
      record.symptoms ? `reported concern: ${record.symptoms}` : "",
      record.symptomDuration ? `duration: ${record.symptomDuration}` : "",
      record.painScore ? `reported pain score: ${record.painScore}/10` : "",
      record.dryMouth && record.dryMouth !== "Not discussed" ? `dry mouth: ${record.dryMouth}` : "",
      record.hydration ? `hydration/recent intake: ${record.hydration}` : "",
      record.medications ? `medications: ${record.medications}` : "",
      record.preventiveContext?.tobacco && record.preventiveContext.tobacco !== "Not discussed"
        ? `tobacco/areca use: ${record.preventiveContext.tobacco}`
        : "",
      record.preventiveContext?.alcohol && record.preventiveContext.alcohol !== "Not discussed"
        ? `alcohol use: ${record.preventiveContext.alcohol}`
        : "",
    ].filter(Boolean);

    return [
      `Patient/visit: ${record.patientName || "Not recorded"}${patientDetails.length ? `; ${patientDetails.join(", ")}` : ""}${record.date ? `; assessed ${record.date}` : ""}.`,
      `Measurements entered: ${[
        record.heightCm ? `height ${record.heightCm} cm` : "",
        record.weightKg ? `weight ${record.weightKg} kg` : "",
        ...measurements,
      ].filter(Boolean).join("; ") || "none recorded"}.`,
      `BMI screening: ${bmi === null ? "not calculated" : `${bmi.toFixed(1)} kg/m²`}; ${interpretBMI(bmi, record.age)}`,
      `Tongue image: ${record.imageDataUrl ? "provided for practitioner review; not analyzed by this prototype" : "not provided"}.`,
      `Tongue observations entered: ${observations.join("; ") || "none recorded"}.`,
      `Patient-reported context: ${context.join("; ") || "none recorded"}.`,
      `Diagnosis: ${record.clinicalImpression || "not generated automatically; practitioner impression not entered"}.`,
      "This summary organizes the entered information only. It does not interpret vital signs or tongue appearance, diagnose a condition, or recommend tests or treatment.",
    ];
  }

  function buildReportSections(record) {
    const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);
    return [
      { title: "Generated assessment summary (non-diagnostic)", lines: buildAssessmentSummary(record) },
      { title: "Patient & visit", lines: [
        `Patient ID: ${record.patientId}`,
        `Patient label: ${record.patientName}`,
        `Assessment date: ${record.date}`,
        `Age: ${record.age ? `${record.age} years` : "Not recorded"}`,
        `Sex: ${record.sex || "Not recorded"}`,
        `Country / region: ${record.country || "Not recorded"}`,
        `Capture setting: ${record.captureSetting || "Not recorded"}`,
      ] },
      { title: "Vital signs & measurements (clinician-entered)", lines: [
        `Height: ${record.heightCm ? `${record.heightCm} cm` : "Not recorded"}`,
        `Weight: ${record.weightKg ? `${record.weightKg} kg` : "Not recorded"}`,
        `Body temperature: ${record.temperatureC ? `${record.temperatureC} °C` : "Not recorded"}`,
        `Blood pressure: ${record.systolicMmHg || record.diastolicMmHg ? `${record.systolicMmHg || "—"} / ${record.diastolicMmHg || "—"} mmHg` : "Not recorded"}`,
        `Heart rate: ${record.heartRateBpm ? `${record.heartRateBpm} beats/min` : "Not recorded"}`,
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
        `Tobacco / areca use: ${record.preventiveContext?.tobacco || "Not discussed"}`,
        `Alcohol use: ${record.preventiveContext?.alcohol || "Not discussed"}`,
        `Oral hygiene routine: ${record.preventiveContext?.oralHygiene || "Not discussed"}`,
        `Dental visit: ${record.preventiveContext?.dentalVisit || "Not discussed"}`,
      ] },
      { title: "Practitioner assessment & plan (clinician-entered)", lines: [
        `Clinical impression / working diagnosis: ${record.clinicalImpression || "Not entered by practitioner"}`,
        `Tests or investigations considered: ${record.testsConsidered || "Not entered by practitioner"}`,
        `Practitioner plan / follow-up: ${record.practitionerPlan || "Not entered by practitioner"}`,
      ] },
      { title: "Practitioner notes", lines: [record.notes || "None recorded"] },
    ];
  }

  return { buildAssessmentSummary, buildReportSections, calculateBMI, createAssessmentRecord, getPatientTimeline, interpretBMI, normalizePatientId, validateAssessment };
}));
