const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReportSections,
  createAssessmentRecord,
  getPatientTimeline,
  normalizePatientId,
  validateAssessment,
} = require("../domain.js");
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
});

test("patient timeline includes only matching IDs and sorts newest first", () => {
  const records = [
    { patientId: "DEMO-001", date: "2026-01-02", createdAt: "2026-01-02T09:00:00Z" },
    { patientId: "OTHER", date: "2026-02-01", createdAt: "2026-02-01T09:00:00Z" },
    { patientId: "demo-001", date: "2026-03-01", createdAt: "2026-03-01T09:00:00Z" },
  ];
  assert.deepEqual(getPatientTimeline(records, " Demo-001 ").map((record) => record.date), ["2026-03-01", "2026-01-02"]);
});

test("structured reports contain observations and no diagnostic inference", () => {
  const sections = buildReportSections(createAssessmentRecord(validInput, { id: "test-id" }));
  const report = sections.flatMap((section) => [section.title, ...section.lines]).join("\n");
  assert.match(report, /Appears pink/);
  assert.match(report, /Symptoms or concerns: Not recorded/);
  assert.match(report, /Clinical impression \/ working diagnosis: Not entered by practitioner/);
  assert.match(report, /Tests or investigations considered: Not entered by practitioner/);
  assert.match(report, /Practitioner plan \/ follow-up: Not entered by practitioner/);
  assert.doesNotMatch(report, /AI[- ](?:recommended|diagnosis)|auto-generated diagnosis/i);
});

test("report carries practitioner-entered impression and investigation planning without generating either", () => {
  const record = createAssessmentRecord({
    ...validInput,
    clinicalImpression: "Practitioner-entered impression",
    testsConsidered: "Practitioner-selected investigations",
    practitionerPlan: "Practitioner-entered follow-up plan",
  });
  const section = buildReportSections(record).find((item) => item.title === "Practitioner assessment & plan (clinician-entered)");
  assert.match(section.lines[0], /Practitioner-entered impression/);
  assert.match(section.lines[1], /Practitioner-selected investigations/);
  assert.match(section.lines[2], /Practitioner-entered follow-up plan/);
});

test("saved reports preserve patient-reported prevention context", () => {
  const record = createAssessmentRecord({ ...validInput, tobacco: "Patient reports former use" });
  const preventiveSection = buildReportSections(record).find((section) => section.title === "Preventive context (patient-reported)");
  assert.match(preventiveSection.lines[0], /Patient reports former use/);
  assert.match(preventiveSection.lines[1], /Not discussed/);
});

test("saved reports include entered demographics and vitals without interpreting them", () => {
  const record = createAssessmentRecord({
    ...validInput,
    age: "42",
    sex: "Female",
    heightCm: "170",
    weightKg: "68.5",
    temperatureC: "36.8",
    heartRateBpm: "72",
    systolicMmHg: "120",
    diastolicMmHg: "80",
  });
  const sections = buildReportSections(record);
  const visit = sections.find((section) => section.title === "Patient & visit");
  const vitals = sections.find((section) => section.title === "Vital signs & measurements (clinician-entered)");
  assert.match(visit.lines.join("\n"), /Age: 42 years/);
  assert.match(visit.lines.join("\n"), /Sex: Female/);
  assert.deepEqual(vitals.lines, [
    "Height: 170 cm",
    "Weight: 68.5 kg",
    "Body temperature: 36.8 °C",
    "Blood pressure: 120 / 80 mmHg",
    "Heart rate: 72 beats/min",
  ]);
});

test("evidence panel contains the four requested public reference sources", () => {
  const organizations = globalThis.HealthEvidence.map((source) => source.organization);
  assert.equal(organizations.length, 4);
  assert.match(organizations.join(" "), /World Health Organization/);
  assert.match(organizations.join(" "), /Centers for Disease Control and Prevention/);
  assert.match(organizations.join(" "), /ICMR/);
  assert.match(organizations.join(" "), /Mayo Clinic/);
  assert.ok(globalThis.HealthEvidence.every((source) => source.url.startsWith("https://")));
});
