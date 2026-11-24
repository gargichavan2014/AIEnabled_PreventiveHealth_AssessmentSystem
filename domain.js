(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AssessmentDomain = api;
}(globalThis, function () {
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
    return errors;
  }

  function createAssessmentRecord(input, { reviewed = false, id, createdAt } = {}) {
    const timestamp = createdAt ?? new Date().toISOString();
    return {
      id: id ?? globalThis.crypto?.randomUUID?.() ?? `assessment-${Date.now()}`,
      patientId: normalizePatientId(input.patientId),
      patientName: String(input.patientName).trim(),
      date: input.date,
      createdAt: timestamp,
      captureSetting: String(input.captureSetting ?? ""),
      imageDataUrl: input.imageDataUrl,
      color: String(input.color ?? ""),
      coating: String(input.coating ?? ""),
      moisture: String(input.moisture ?? ""),
      shape: String(input.shape ?? ""),
      otherFeatures: String(input.otherFeatures ?? "").trim(),
      certainty: String(input.certainty ?? ""),
      symptoms: String(input.symptoms ?? "").trim(),
      hydration: String(input.hydration ?? "").trim(),
      medications: String(input.medications ?? "").trim(),
      preventiveContext: {
        tobacco: String(input.tobacco ?? "").trim(),
        alcohol: String(input.alcohol ?? "").trim(),
        oralHygiene: String(input.oralHygiene ?? "").trim(),
        dentalVisit: String(input.dentalVisit ?? "").trim(),
      },
      notes: String(input.notes ?? "").trim(),
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

  function buildReportSections(record) {
    return [
      { title: "Patient & visit", lines: [
        `Patient ID: ${record.patientId}`,
        `Patient label: ${record.patientName}`,
        `Assessment date: ${record.date}`,
        `Capture setting: ${record.captureSetting || "Not recorded"}`,
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
        `Hydration / recent intake: ${record.hydration || "Not recorded"}`,
        `Medications / changes: ${record.medications || "Not recorded"}`,
      ] },
      { title: "Preventive context (patient-reported)", lines: [
        `Tobacco / areca use: ${record.preventiveContext?.tobacco || "Not discussed"}`,
        `Alcohol use: ${record.preventiveContext?.alcohol || "Not discussed"}`,
        `Oral hygiene routine: ${record.preventiveContext?.oralHygiene || "Not discussed"}`,
        `Dental visit: ${record.preventiveContext?.dentalVisit || "Not discussed"}`,
      ] },
      { title: "Practitioner notes", lines: [record.notes || "None recorded"] },
    ];
  }

  return { buildReportSections, createAssessmentRecord, getPatientTimeline, normalizePatientId, validateAssessment };
}));
