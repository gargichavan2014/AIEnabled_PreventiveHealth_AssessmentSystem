const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReportSections,
  calculateBMI,
  createAssessmentRecord,
  generateBatchDiagnosisReports,
  generateDiagnosticAssessment,
  getPatientTimeline,
  normalizePatientId,
  interpretBMI,
  interpretVitals,
  validateAssessment,
} = require("../domain.js");
const syntheticSamples = require("../sample-data.js");
require("../evidence.js");

const validInput = {
  patientId: " demo-001 ",
  patientName: "Sample patient",
  date: "2026-11-24",
  imageDataUrl: "data:image/jpeg;base64,abc",
  consent: true,
  color: "Appears pink",
  coating: "Thin / light",
  reviewer: "Dr Example",
  reviewed: true,
};

test("patient IDs are matched case-insensitively after trimming", () => {
  assert.equal(normalizePatientId(" demo-001 "), "DEMO-001");
});

test("assessment validation requires consent and an image", () => {
  assert.deepEqual(validateAssessment(validInput), []);
  assert.deepEqual(
    validateAssessment({ ...validInput, imageDataUrl: "", consent: false }),
    ["Add a tongue image before saving.", "Confirm demo consent before saving."],
  );
});

test("vital-sign validation accepts blank optional fields and rejects out-of-range values", () => {
  assert.deepEqual(validateAssessment(validInput), []);
  assert.deepEqual(validateAssessment({
    ...validInput,
    age: "131",
    temperatureC: "50",
    systolicMmHg: "20",
  }), [
    "Age must be between 0 and 130.",
    "Body temperature must be between 25 and 45.",
    "Systolic blood pressure must be between 40 and 300.",
  ]);
});

test("BMI uses metric inputs and is only interpreted against adult references at age 20+", () => {
  assert.equal(calculateBMI("170", "68.5"), 68.5 / (1.7 ** 2));
  assert.equal(calculateBMI("", "68.5"), null);
  assert.equal(calculateBMI("0", "68.5"), null);
  assert.match(interpretBMI(calculateBMI("170", "68.5"), "42"), /Adult BMI screening reference: healthy-weight range/);
  assert.match(interpretBMI(17, "20"), /underweight/);
  assert.match(interpretBMI(25, "20"), /overweight/);
  assert.match(interpretBMI(30, "20"), /obesity/);
  assert.match(interpretBMI(calculateBMI("170", "68.5"), "19"), /age- and sex-specific growth-chart/);
  assert.match(interpretBMI(calculateBMI("170", "68.5"), "1"), /weight-for-length\/height/);
  assert.match(interpretBMI(calculateBMI("170", "68.5"), ""), /age is needed/);
});

test("patient-reported pain score is optional and restricted to the stated 0–10 scale", () => {
  assert.deepEqual(validateAssessment(validInput), []);
  assert.deepEqual(validateAssessment({ ...validInput, painScore: "11" }), [
    "Patient-reported pain score must be between 0 and 10.",
  ]);
});

test("reviewed reports require a practitioner and explicit review confirmation", () => {
  assert.deepEqual(validateAssessment(validInput, { requireReview: true }), []);
  assert.deepEqual(
    validateAssessment({ ...validInput, reviewer: "", reviewed: false }, { requireReview: true }),
    [
      "Enter the practitioner name to save a reviewed report.",
      "Confirm practitioner review before saving a reviewed report.",
    ],
  );
});

test("saved records normalize patient IDs and keep drafts unreviewed", () => {
  const record = createAssessmentRecord(validInput, { id: "test-id", createdAt: "2026-11-24T10:00:00.000Z" });
  assert.equal(record.patientId, "DEMO-001");
  assert.equal(record.reviewedAt, null);
  assert.equal(record.reviewer, "");
  assert.equal(record.bmi, null);
});

test("bundled sample records are fictional, marked synthetic, and do not invent diagnoses", () => {
  assert.equal(syntheticSamples.length, 4);
  for (const record of syntheticSamples) {
    assert.equal(record.isSynthetic, true);
    assert.match(record.patientId, /^(SYNTH-|RAHUL)/);
    assert.equal(record.imageDataUrl, undefined);
    assert.equal(record.clinicalImpression, "");
    assert.equal(record.testsConsidered, "");
    assert.equal(record.practitionerPlan, "");
  }
  const child = syntheticSamples.find((record) => record.age === "12");
  assert.match(buildReportSections(child).find((section) => section.title === "BMI screening summary").lines[1], /age- and sex-specific growth-chart/);
});

test("patient timeline includes only matching IDs and sorts newest first", () => {
  const records = [
    { patientId: "DEMO-001", date: "2026-01-02", createdAt: "2026-01-02T09:00:00Z" },
    { patientId: "OTHER", date: "2026-02-01", createdAt: "2026-02-01T09:00:00Z" },
    { patientId: "demo-001", date: "2026-03-01", createdAt: "2026-03-01T09:00:00Z" },
  ];
  assert.deepEqual(getPatientTimeline(records, " Demo-001 ").map((record) => record.date), ["2026-03-01", "2026-01-02"]);
});

test("structured reports include parameter-based diagnostic assessment and clinician override section", () => {
  const sections = buildReportSections(createAssessmentRecord({
    ...validInput,
    age: "35",
    heightCm: "165",
    weightKg: "62.5",
    temperatureC: "36.7",
    heartRateBpm: "72",
    systolicMmHg: "118",
    diastolicMmHg: "76",
    moisture: "Appears moist",
  }, { id: "test-id" }));
  const report = sections.flatMap((section) => [section.title, ...section.lines]).join("\n");
  assert.match(report, /Automated diagnostic assessment \(parameter-based\)/);
  assert.match(report, /Recommended investigations & diagnostic tests/);
  assert.match(report, /Suggested care & preventive plan/);
  assert.match(report, /Suggested diet & nutritional guidance/);
  assert.match(report, /Unremarkable Baseline Screening/);
  assert.match(report, /Clinician sign-off & overrides/);
});

test("report carries practitioner-entered impression and investigation planning", () => {
  const record = createAssessmentRecord({
    ...validInput,
    clinicalImpression: "Practitioner-entered impression",
    testsConsidered: "Practitioner-selected investigations",
    practitionerPlan: "Practitioner-entered follow-up plan",
  });
  const section = buildReportSections(record).find((item) => item.title === "Clinician sign-off & overrides");
  assert.match(section.lines[0], /Practitioner-entered impression/);
  assert.match(section.lines[1], /Practitioner-selected investigations/);
  assert.match(section.lines[2], /Practitioner-entered follow-up plan/);
});

test("diagnostic engine flags pale tongue, fatigue, and tachycardia as suspected anemia/deficiency", () => {
  const record = createAssessmentRecord({
    ...validInput,
    age: "29",
    sex: "Female",
    heightCm: "162",
    weightKg: "46",
    temperatureC: "36.8",
    heartRateBpm: "108",
    systolicMmHg: "106",
    diastolicMmHg: "68",
    color: "Appears pale",
    coating: "Thin / light",
    symptoms: "Progressive fatigue and dizziness for 3 weeks",
    symptomDuration: "3 weeks",
  });
  const diagnosis = generateDiagnosticAssessment(record);
  assert.equal(diagnosis.riskLevel, "Moderate");
  assert.ok(diagnosis.primaryImpressions.some((i) => /Anemia or Micronutrient Deficiency/i.test(i.title)));
  assert.ok(diagnosis.recommendedTests.some((t) => /CBC|ferritin|B12/i.test(t)));
});

test("diagnostic engine flags heavy coating, dry mouth, and steroid exposure as oral candidiasis screening", () => {
  const record = createAssessmentRecord({
    ...validInput,
    age: "58",
    color: "Appears red",
    coating: "Thicker / more visible",
    moisture: "Appears dry",
    dryMouth: "Patient reports yes",
    painScore: "4",
    medications: "Inhaled budesonide steroid inhaler",
  });
  const diagnosis = generateDiagnosticAssessment(record);
  assert.ok(diagnosis.primaryImpressions.some((i) => /Oral Candidiasis/i.test(i.title)));
  assert.ok(diagnosis.primaryImpressions.some((i) => /Xerostomia/i.test(i.title)));
});

test("diagnostic engine escalates urgent vitals and persistent mucosal lesion with tobacco risk", () => {
  const urgentVitalsRecord = createAssessmentRecord({
    ...validInput,
    age: "62",
    temperatureC: "39.4",
    heartRateBpm: "126",
    systolicMmHg: "184",
    diastolicMmHg: "122",
  });
  const urgentDiagnosis = generateDiagnosticAssessment(urgentVitalsRecord);
  assert.equal(urgentDiagnosis.riskLevel, "Urgent");
  assert.ok(interpretVitals(urgentVitalsRecord).every((f) => f.key === "bmi" || f.status === "urgent"));

  const lesionRecord = createAssessmentRecord({
    ...validInput,
    age: "54",
    shape: "Visible variation noted",
    otherFeatures: "Non-healing white patch and ulcer on lateral border",
    symptomDuration: "4 weeks",
    tobacco: "Patient reports current use",
    alcohol: "Patient reports use",
  });
  const lesionDiagnosis = generateDiagnosticAssessment(lesionRecord);
  assert.equal(lesionDiagnosis.riskLevel, "Urgent");
  assert.ok(lesionDiagnosis.primaryImpressions.some((i) => /Persistent Oral Mucosal Lesion/i.test(i.title)));
});

test("synthetic sample records produce distinct patient-specific diagnostic assessments", () => {
  const adultA = generateDiagnosticAssessment(syntheticSamples[0]);
  const child = generateDiagnosticAssessment(syntheticSamples[1]);
  const adultB = generateDiagnosticAssessment(syntheticSamples[2]);
  const fullCase = generateDiagnosticAssessment(syntheticSamples[3]);
  assert.equal(adultA.riskLevel, "Low");
  assert.match(child.vitalFlags.find((f) => f.key === "bmi").detail, /growth-chart/);
  assert.equal(adultB.riskLevel, "Moderate");
  assert.ok(adultB.primaryImpressions.some((i) => /Xerostomia/i.test(i.title)));
  assert.ok(adultB.primaryImpressions.some((i) => /Elevated Blood Pressure/i.test(i.title)));
  assert.equal(fullCase.riskLevel, "Moderate");
  assert.equal(fullCase.parameterEvaluations.length, 9);
  assert.ok(fullCase.primaryImpressions.some((i) => /Anemia|Micronutrient/i.test(i.title)));
  assert.ok(fullCase.primaryImpressions.some((i) => /Xerostomia/i.test(i.title)));
  assert.ok(fullCase.suggestedDiet.some((d) => /Iron-, folate-, and Vitamin B12-rich/i.test(d)));
  assert.ok(fullCase.suggestedDiet.some((d) => /Soothing, non-irritating oral diet/i.test(d)));
  assert.ok(fullCase.suggestedDiet.some((d) => /ICMR–NIN/i.test(d)));
  assert.ok(adultB.suggestedDiet.some((d) => /Low-free-sugar/i.test(d)));
  assert.ok(adultB.suggestedDiet.some((d) => /DASH-aligned/i.test(d)));
  assert.ok(adultB.suggestedDiet.some((d) => /weight-management plate/i.test(d)));
  assert.ok(adultA.suggestedDiet.length >= 1);
  assert.ok(child.suggestedDiet.some((d) => /WHO BMI-for-age/i.test(d)));
});

test("batch report generation generates one latest report per live patient and can include synthetic samples", () => {
  const liveOld = createAssessmentRecord({ ...validInput, patientId: "LIVE-101", patientName: "Live Patient A", date: "2026-11-20", color: "Appears pink" }, { id: "live-old" });
  const liveNew = createAssessmentRecord({ ...validInput, patientId: "live-101", patientName: "Live Patient A", date: "2026-11-27", color: "Appears pale", temperatureC: "38.5" }, { id: "live-new" });
  const liveTwo = createAssessmentRecord({ ...validInput, patientId: "LIVE-102", patientName: "Live Patient B", date: "2026-11-27", systolicMmHg: "184", diastolicMmHg: "120" }, { id: "live-two" });
  const all = [liveOld, liveNew, liveTwo, ...syntheticSamples];

  const liveReports = generateBatchDiagnosisReports(all, { liveOnly: true, latestPerPatient: true });
  assert.equal(liveReports.length, 2);
  const allLiveAssessments = generateBatchDiagnosisReports(all, { liveOnly: true, latestPerPatient: false });
  assert.equal(allLiveAssessments.length, 3);
  const p1 = liveReports.find((r) => r.record.patientId === "LIVE-101");
  const p2 = liveReports.find((r) => r.record.patientId === "LIVE-102");
  assert.equal(p1.record.id, "live-new");
  assert.equal(p1.diagnosis.riskLevel, "Moderate");
  assert.equal(p2.diagnosis.riskLevel, "Urgent");

  const withSynthetic = generateBatchDiagnosisReports(all, { liveOnly: false, latestPerPatient: true });
  assert.equal(withSynthetic.length, 6);
});

test("saved reports preserve patient-reported prevention context", () => {
  const record = createAssessmentRecord({ ...validInput, tobacco: "Patient reports former use" });
  const preventiveSection = buildReportSections(record).find((section) => section.title === "Preventive context (patient-reported)");
  assert.match(preventiveSection.lines[0], /Patient reports former use/);
  assert.match(preventiveSection.lines[1], /Not discussed/);
});

test("patient-reported symptom duration, pain and dry-mouth context are saved in the report", () => {
  const record = createAssessmentRecord({
    ...validInput,
    symptoms: "Tongue discomfort",
    symptomDuration: "3 days",
    painScore: "4",
    dryMouth: "Patient reports yes",
  });
  const section = buildReportSections(record).find((item) => item.title === "Patient-provided context");
  assert.match(section.lines.join("\n"), /Symptom duration: 3 days/);
  assert.match(section.lines.join("\n"), /Pain score \(patient-reported, 0–10\): 4/);
  assert.match(section.lines.join("\n"), /Dry mouth \(patient-reported\): Patient reports yes/);
});

test("saved reports include demographics, vitals and age-appropriate BMI screening context", () => {
  const record = createAssessmentRecord({
    ...validInput,
    age: "42",
    sex: "Female",
    country: "India",
    heightCm: "170",
    weightKg: "68.5",
    temperatureC: "36.8",
    heartRateBpm: "72",
    systolicMmHg: "120",
    diastolicMmHg: "80",
  });
  const sections = buildReportSections(record);
  const visit = sections.find((section) => section.title === "Patient & visit");
  const vitals = sections.find((section) => section.title === "Vital signs & clinical interpretation");
  assert.match(visit.lines.join("\n"), /Age: 42 years/);
  assert.match(visit.lines.join("\n"), /Sex: Female/);
  assert.match(visit.lines.join("\n"), /Country \/ region: India/);
  const vitalsText = vitals.lines.join("\n");
  assert.match(vitalsText, /Height: 170 cm/);
  assert.match(vitalsText, /Weight: 68\.5 kg/);
  assert.match(vitalsText, /Body temperature: 36\.8 °C \[NORMAL\]/);
  assert.match(vitalsText, /Heart rate: 72 beats\/min \[NORMAL\]/);
  assert.match(vitalsText, /Blood pressure: 120 \/ 80 mmHg \[BORDERLINE\]/);
  const bmi = sections.find((section) => section.title === "BMI screening summary");
  assert.match(bmi.lines[0], /^BMI: \d+\.\d kg\/m²$/);
  assert.match(bmi.lines[1], /Adult BMI screening reference: healthy-weight range/);
  assert.match(bmi.lines[2], /India/);
});

test("evidence panel contains linked public-reference sources", () => {
  const organizations = globalThis.HealthEvidence.map((source) => source.organization);
  assert.equal(organizations.length, 7);
  assert.match(organizations.join(" "), /World Health Organization/);
  assert.match(organizations.join(" "), /Centers for Disease Control and Prevention/);
  assert.match(organizations.join(" "), /ICMR/);
  assert.match(organizations.join(" "), /Mayo Clinic/);
  assert.ok(globalThis.HealthEvidence.every((source) => source.url.startsWith("https://")));
  const allUrls = globalThis.HealthEvidence.flatMap((source) => [source.url, ...(source.extraLinks || []).map((l) => l.url)]);
  assert.ok(allUrls.includes("https://www.cdc.gov/bmi/about/index.html"));
  assert.ok(allUrls.includes("https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age"));
});
