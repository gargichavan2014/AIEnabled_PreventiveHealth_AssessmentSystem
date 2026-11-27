const { buildReportSections, calculateBMI, createAssessmentRecord, generateBatchDiagnosisReports, generateDiagnosticAssessment, getPatientTimeline, interpretBMI, normalizePatientId, validateAssessment } = window.AssessmentDomain;
const healthEvidence = window.HealthEvidence;
const syntheticSampleAssessments = window.SyntheticSampleAssessments;

const STORAGE_KEY = "careform-demo-assessments-v1";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const form = document.querySelector("#assessment-form");
const imageInput = document.querySelector("#tongue-image");
const preview = document.querySelector("#image-preview");
const previewImage = document.querySelector("#preview-image");
const formError = document.querySelector("#form-error");
const storageWarning = document.querySelector("#storage-warning");
let assessments = [];
let currentImageDataUrl = "";

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${name}-view`);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === name);
  });
  const titles = { dashboard: "Overview", assessment: "New assessment", history: "Patient history", evidence: "Evidence & guidance", report: "Diagnosis report" };
  document.querySelector("#breadcrumb-current").textContent = titles[name] ?? "Overview";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadAssessments() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) throw new Error("Saved assessment data is not in the expected format.");
  return parsed;
}

function persistAssessments(nextAssessments) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAssessments));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Browser storage is unavailable.";
    throw new Error(`Could not save this assessment. ${reason}`);
  }
  assessments = nextAssessments;
  renderDashboard();
}

function statusPill(record) {
  if (record.isSynthetic) {
    const pill = element("span", "status-pill synthetic-pill");
    pill.append(element("span"));
    pill.append(document.createTextNode("Synthetic sample"));
    return pill;
  }
  const reviewed = Boolean(record.reviewedAt);
  const pill = element("span", `status-pill${reviewed ? " reviewed" : ""}`);
  pill.append(element("span"));
  pill.append(document.createTextNode(reviewed ? "Reviewed" : "Awaiting review"));
  return pill;
}

function addRecordRow(container, record) {
  const row = element("div", "record-row");
  const main = element("div", "record-main");
  main.append(element("strong", "", record.patientName));
  main.append(element("small", "", `ID ${record.patientId}`));
  if (record.isSynthetic) main.append(element("small", "synthetic-record-label", "FICTIONAL DEMO DATA"));
  const date = element("div", "record-meta");
  date.append(element("strong", "", record.date));
  date.append(element("small", "", record.captureSetting || "Setting not recorded"));
  const status = element("div", "record-meta");
  status.append(statusPill(record));
  const open = element("button", "record-open", "Open report");
  open.type = "button";
  open.addEventListener("click", () => renderReport(record));
  row.append(main, date, status, open);
  container.append(row);
}

function renderDashboard() {
  const patientIds = new Set(assessments.map((record) => normalizePatientId(record.patientId)).filter(Boolean));
  document.querySelector("#patient-count").textContent = String(patientIds.size);
  document.querySelector("#assessment-count").textContent = String(assessments.length);
  document.querySelector("#review-count").textContent = String(assessments.filter((record) => !record.reviewedAt && !record.isSynthetic).length);
  const container = document.querySelector("#recent-list");
  container.replaceChildren();
  const recent = assessments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  if (recent.length === 0) {
    const empty = element("div", "empty-state");
    empty.append(element("span", "empty-icon", "＋"));
    empty.append(element("h2", "", "No assessments yet"));
    empty.append(element("p", "", "Start with a synthetic patient record. Save a draft for later review or mark the report reviewed when appropriate."));
    container.append(empty);
    return;
  }
  recent.forEach((record) => addRecordRow(container, record));
}

function renderEvidenceCard(source, compact = false) {
  const card = element("article", "evidence-card");
  card.append(element("div", "evidence-source", source.organization));
  card.append(element("h3", "", source.title));
  card.append(element("p", "evidence-summary", source.summary));
  if (!compact) {
    const data = element("ul", "evidence-points");
    source.points.forEach((point) => data.append(element("li", "", point)));
    card.append(data);
    card.append(element("small", "evidence-scope", source.scope));
  }
  const link = element("a", "evidence-link", "Open source ↗");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  card.append(link);
  if (!compact && Array.isArray(source.extraLinks)) {
    source.extraLinks.forEach((extra) => {
      const extraLink = element("a", "evidence-link", `${extra.label} ↗`);
      extraLink.href = extra.url;
      extraLink.target = "_blank";
      extraLink.rel = "noopener noreferrer";
      card.append(extraLink);
    });
  }
  return card;
}

function renderEvidence() {
  const previewGrid = document.querySelector("#evidence-preview-grid");
  const fullGrid = document.querySelector("#evidence-grid");
  previewGrid.replaceChildren();
  fullGrid.replaceChildren();
  healthEvidence.forEach((source) => {
    previewGrid.append(renderEvidenceCard(source, true));
    fullGrid.append(renderEvidenceCard(source));
  });
}

function updateBMIPreview() {
  const bmi = calculateBMI(form.elements.heightCm.value, form.elements.weightKg.value);
  document.querySelector("#bmi-preview-value").textContent = bmi === null ? "—" : bmi.toFixed(1);
  document.querySelector("#bmi-preview-interpretation").textContent = interpretBMI(bmi, form.elements.age.value);
}

function collectDraftRecordFromForm() {
  const values = Object.fromEntries(new FormData(form).entries());
  return createAssessmentRecord({
    ...values,
    patientId: values.patientId || "PREVIEW",
    patientName: values.patientName || "Current patient",
    date: values.date || new Date().toISOString().slice(0, 10),
    imageDataUrl: currentImageDataUrl,
  });
}

function riskClassName(riskLevel) {
  const normalized = String(riskLevel ?? "incomplete").toLowerCase();
  return ["urgent", "moderate", "low", "incomplete"].includes(normalized) ? `risk-${normalized}` : "risk-incomplete";
}

function renderDiagnosisBanner(diagnosis) {
  const banner = element("div", `diagnosis-banner ${riskClassName(diagnosis.riskLevel)}`);
  const top = element("div", "diagnosis-banner-top");
  const pill = element("span", `risk-pill ${riskClassName(diagnosis.riskLevel)}`, `${diagnosis.riskLevel} priority`);
  top.append(pill, element("strong", "diagnosis-headline", diagnosis.riskSummary));
  banner.append(top);

  const chips = element("div", "vital-chips");
  diagnosis.vitalFlags.forEach((flag) => {
    const chip = element("span", `vital-chip vital-${flag.status}`, `${flag.label}: ${flag.value}`);
    chip.title = flag.detail;
    chips.append(chip);
  });
  banner.append(chips);

  const cards = element("div", "diagnosis-cards");
  diagnosis.primaryImpressions.forEach((item) => {
    const card = element("div", "diagnosis-card");
    const cardHead = element("div", "diagnosis-card-head");
    cardHead.append(element("strong", "", item.title));
    cardHead.append(element("span", "diagnosis-likelihood", item.likelihood));
    card.append(cardHead);
    if (item.matchedParameters.length) {
      card.append(element("small", "diagnosis-params", `Matched parameters: ${item.matchedParameters.join(" · ")}`));
    }
    card.append(element("p", "", item.rationale));
    cards.append(card);
  });
  banner.append(cards);
  return banner;
}

function updateDiagnosisPreview() {
  const container = document.querySelector("#diagnosis-preview");
  if (!container) return;
  const draft = collectDraftRecordFromForm();
  const diagnosis = generateDiagnosticAssessment(draft);
  container.replaceChildren();
  container.append(renderDiagnosisBanner(diagnosis));

  const nextWrap = element("div", "diagnosis-preview-lists");
  const testsBlock = element("div");
  testsBlock.append(element("strong", "", "Suggested investigations"));
  const testList = element("ul");
  diagnosis.recommendedTests.slice(0, 4).forEach((t) => testList.append(element("li", "", t)));
  testsBlock.append(testList);

  const planBlock = element("div");
  planBlock.append(element("strong", "", "Suggested care & preventive plan"));
  const planList = element("ul");
  diagnosis.carePlan.slice(0, 4).forEach((step) => planList.append(element("li", "", step)));
  planBlock.append(planList);

  const dietBlock = element("div");
  dietBlock.append(element("strong", "", "Suggested diet & nutrition"));
  const dietList = element("ul");
  diagnosis.suggestedDiet.slice(0, 4).forEach((dietItem) => dietList.append(element("li", "", dietItem)));
  dietBlock.append(dietList);

  nextWrap.append(testsBlock, planBlock, dietBlock);
  container.append(nextWrap);
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function readImage(file) {
  if (!file) return Promise.reject(new Error("Choose an image file."));
  if (!allowedTypes.has(file.type)) return Promise.reject(new Error("Use a JPEG, PNG or WebP image."));
  if (file.size > MAX_IMAGE_BYTES) return Promise.reject(new Error("Choose an image smaller than 8 MB."));

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("This browser could not prepare the image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file could not be opened as an image."));
    };
    image.src = objectUrl;
  });
}

imageInput.addEventListener("change", async () => {
  showFormError("");
  const file = imageInput.files?.[0];
  if (!file) return;
  try {
    currentImageDataUrl = await readImage(file);
    previewImage.src = currentImageDataUrl;
    document.querySelector("#image-name").textContent = file.name;
    preview.hidden = false;
  } catch (error) {
    currentImageDataUrl = "";
    imageInput.value = "";
    preview.hidden = true;
    showFormError(error instanceof Error ? error.message : "The image could not be prepared.");
  }
});

document.querySelector("#remove-image").addEventListener("click", () => {
  currentImageDataUrl = "";
  imageInput.value = "";
  preview.hidden = true;
  previewImage.removeAttribute("src");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const reviewed = submitter?.value === "reviewed";
  const values = Object.fromEntries(new FormData(form).entries());
  const input = {
    ...values,
    imageDataUrl: currentImageDataUrl,
    consent: form.elements.consent.checked,
    reviewed: form.elements.reviewed.checked,
  };
  const errors = validateAssessment(input, { requireReview: reviewed });
  if (errors.length) {
    showFormError(errors.join(" "));
    return;
  }
  const record = createAssessmentRecord(input, { reviewed });
  try {
    persistAssessments([record, ...assessments]);
  } catch (error) {
    showFormError(error instanceof Error ? error.message : "The assessment could not be saved.");
    return;
  }
  form.reset();
  form.elements.date.value = new Date().toISOString().slice(0, 10);
  updateBMIPreview();
  currentImageDataUrl = "";
  preview.hidden = true;
  updateDiagnosisPreview();
  showFormError("");
  renderReport(record);
});

function reportSection(section) {
  const wrapper = element("section", "report-section");
  wrapper.append(element("h3", "", section.title));
  section.lines.forEach((line) => wrapper.append(element("p", "", line)));
  return wrapper;
}

function buildReportArticleElement(record) {
  const report = element("article", "panel report-sheet");
  const diagnosis = generateDiagnosticAssessment(record);
  const bmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);

  const header = element("div", "report-topline report-topline-clinical");
  const title = element("div");
  title.append(element("div", "eyebrow report-eyebrow", "CAREFORM CLINICAL DECISION SUPPORT · PATIENT DIAGNOSIS REPORT"));
  title.append(element("h2", "", "Patient Diagnosis Report"));
  const subParts = [
    record.patientName || "Patient",
    `Patient ID: ${record.patientId}`,
    `Age/Sex: ${record.age ? `${record.age}y` : "—"} / ${record.sex || "Not recorded"}`,
    record.country ? `Country: ${record.country}` : "",
    `Date: ${record.date}`,
  ].filter(Boolean);
  title.append(element("p", "", subParts.join(" · ")));
  const status = element("div", "report-status report-status-stack");
  status.append(element("span", `status-badge-text ${riskClassName(diagnosis.riskLevel)}`, diagnosis.statusLabel));
  status.append(statusPill(record));
  header.append(title, status);
  report.append(header);

  if (record.isSynthetic) {
    const sampleBanner = element("div", "sample-report-banner");
    sampleBanner.append(element("strong", "", "SYNTHETIC SAMPLE — NOT A REAL PATIENT: "));
    sampleBanner.append(document.createTextNode("Fictional clinical values from the repository are evaluated below to demonstrate a complete parameter-driven Diagnosis Report."));
    report.append(sampleBanner);
  }

  // 1. Primary Diagnostic Impression
  const sec1 = element("section", "report-card-block report-primary-impression");
  sec1.append(element("div", "report-block-title", "1. PRIMARY DIAGNOSTIC IMPRESSION (SYNTHESIZED FROM ASSESSMENT PARAMETERS)"));
  sec1.append(element("h3", "primary-impression-headline", diagnosis.primaryHeadline));
  sec1.append(element("p", "primary-impression-copy", diagnosis.primarySummary));
  report.append(sec1);

  // 4 Summary KPI Cards
  const kpiGrid = element("div", "report-kpi-grid");
  const kpiCards = [
    {
      label: "TONGUE VISUALS",
      value: record.color || "Not assessed",
      sub: [record.coating || "Coating not assessed", record.moisture || "Moisture not assessed"].join(" · "),
    },
    {
      label: "BMI SCREENING",
      value: bmi === null ? "Not calculated" : `${bmi.toFixed(1)} kg/m²`,
      sub: interpretBMI(bmi, record.age).replace("Adult BMI screening reference: ", "").replace("; not a diagnosis.", ""),
    },
    {
      label: "HEMODYNAMICS & TEMP",
      value: (record.systolicMmHg || record.diastolicMmHg) ? `${record.systolicMmHg || "—"} / ${record.diastolicMmHg || "—"} mmHg` : "BP not recorded",
      sub: [record.heartRateBpm ? `HR ${record.heartRateBpm} bpm` : "HR —", record.temperatureC ? `${record.temperatureC}°C` : "Temp —"].join(" · "),
    },
    {
      label: "SYMPTOM BURDEN",
      value: record.painScore !== "" && record.painScore !== undefined ? `Pain ${record.painScore}/10` : "Pain not scored",
      sub: record.symptomDuration ? `Duration: ${record.symptomDuration}` : (record.symptoms ? "Symptoms noted" : "Duration not recorded"),
    },
  ];
  kpiCards.forEach((kpi) => {
    const card = element("div", "report-kpi-card");
    card.append(element("div", "report-kpi-label", kpi.label));
    card.append(element("strong", "report-kpi-value", kpi.value));
    card.append(element("small", "report-kpi-sub", kpi.sub));
    kpiGrid.append(card);
  });
  report.append(kpiGrid);

  // 2. Differential Diagnoses & Clinical Correlations
  const sec2 = element("section", "report-card-block");
  sec2.append(element("div", "report-block-title", "2. DIFFERENTIAL DIAGNOSES & CLINICAL CORRELATIONS"));
  const diffList = element("div", "differential-list");
  diagnosis.primaryImpressions.forEach((item) => {
    const card = element("div", "differential-card");
    const head = element("div", "differential-head");
    head.append(element("strong", "", item.title));
    head.append(element("span", "differential-badge", item.likelihood));
    card.append(head);
    const trig = element("p", "differential-line");
    trig.append(element("strong", "", "Triggering parameters: "));
    trig.append(document.createTextNode(item.matchedParameters.join("; ") || "General clinical parameters"));
    card.append(trig);
    const interp = element("p", "differential-line");
    interp.append(element("strong", "", "Diagnostic interpretation: "));
    interp.append(document.createTextNode(item.rationale));
    card.append(interp);
    diffList.append(card);
  });
  sec2.append(diffList);
  report.append(sec2);

  // 3. Parameter-by-Parameter Diagnostic Evaluation Table
  const sec3 = element("section", "report-card-block");
  sec3.append(element("div", "report-block-title", "3. PARAMETER-BY-PARAMETER DIAGNOSTIC EVALUATION"));
  const tableWrap = element("div", "eval-table-wrap");
  const table = element("table", "eval-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["PARAMETER DOMAIN", "RECORDED VALUE", "FINDING STATUS", "DIAGNOSTIC MEANING"].forEach((col) => {
    headRow.append(element("th", "", col));
  });
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  diagnosis.parameterEvaluations.forEach((row) => {
    const tr = document.createElement("tr");
    tr.append(element("td", "eval-domain", row.domain));
    tr.append(element("td", "eval-value", row.recordedValue));
    tr.append(element("td", `eval-status tone-${row.tone}`, row.status));
    tr.append(element("td", "eval-meaning", row.meaning));
    tbody.append(tr);
  });
  table.append(tbody);
  tableWrap.append(table);
  sec3.append(tableWrap);
  report.append(sec3);

  // 4. Recommended Investigations & Workup
  const sec4 = element("section", "report-card-block");
  sec4.append(element("div", "report-block-title", "4. RECOMMENDED INVESTIGATIONS & WORKUP"));
  const invList = element("ul", "report-bullet-list");
  diagnosis.recommendedTests.forEach((testItem) => invList.append(element("li", "", testItem)));
  sec4.append(invList);
  if (record.testsConsidered) {
    const extraTests = element("p", "clinician-override-note");
    extraTests.append(element("strong", "", "Clinician-entered tests: "));
    extraTests.append(document.createTextNode(record.testsConsidered));
    sec4.append(extraTests);
  }
  report.append(sec4);

  // 5. Management & Follow-Up Plan
  const sec5 = element("section", "report-card-block");
  sec5.append(element("div", "report-block-title", "5. MANAGEMENT & FOLLOW-UP PLAN"));
  const mgmtList = element("ul", "report-bullet-list");
  diagnosis.carePlan.forEach((step) => mgmtList.append(element("li", "", step)));
  sec5.append(mgmtList);
  if (record.clinicalImpression || record.practitionerPlan) {
    const overrideNote = element("div", "clinician-override-note");
    if (record.clinicalImpression) {
      const p1 = element("p", "");
      p1.append(element("strong", "", "Clinician impression: "));
      p1.append(document.createTextNode(record.clinicalImpression));
      overrideNote.append(p1);
    }
    if (record.practitionerPlan) {
      const p2 = element("p", "");
      p2.append(element("strong", "", "Clinician follow-up plan: "));
      p2.append(document.createTextNode(record.practitionerPlan));
      overrideNote.append(p2);
    }
    sec5.append(overrideNote);
  }
  report.append(sec5);

  // 6. Suggested Diet & Nutritional Guidance
  const secDiet = element("section", "report-card-block report-diet-block");
  secDiet.append(element("div", "report-block-title", "6. SUGGESTED DIET & NUTRITIONAL GUIDANCE"));
  const dietList = element("ul", "report-bullet-list");
  diagnosis.suggestedDiet.forEach((dietItem) => dietList.append(element("li", "", dietItem)));
  secDiet.append(dietList);
  report.append(secDiet);

  // 7. Visual Capture Context & Reference Basis
  const sec6 = element("section", "report-card-block");
  sec6.append(element("div", "report-block-title", "7. VISUAL CAPTURE CONTEXT & REFERENCE BASIS"));
  const imgBox = element("div", "report-image-box");
  if (record.imageDataUrl) {
    const image = document.createElement("img");
    image.src = record.imageDataUrl;
    image.alt = "Tongue image provided for this observation record";
    imgBox.append(image);
  } else {
    imgBox.append(element("p", "field-hint", record.isSynthetic ? "No tongue photograph attached in this synthetic demo record." : "No saved image."));
  }
  sec6.append(imgBox);

  const metaLines = [
    [
      `Capture setting: ${record.captureSetting || "Not recorded"}`,
      `Certainty: ${record.certainty || "Not recorded"}`,
      `Shape / surface: ${record.shape || "Not assessed"}`,
    ].join(" · "),
    record.otherFeatures ? `Other features: ${record.otherFeatures}` : "",
    record.notes ? `Practitioner notes: ${record.notes}` : "",
  ].filter(Boolean);
  metaLines.forEach((line) => sec6.append(element("p", "capture-context-line", line)));

  const refChips = element("div", "ref-chip-row");
  healthEvidence.forEach((src) => {
    const a = element("a", "ref-chip", `${src.organization.replace("World Health Organization", "WHO").replace("U.S. Centers for Disease Control and Prevention", "CDC").replace("National Institutes of Health", "NIH").replace("ICMR–National Institute of Nutrition", "ICMR–NIN").replace("Mayo Clinic · public education", "Mayo Clinic")}: ${src.title} ↗`);
    a.href = src.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    refChips.append(a);
    (src.extraLinks || []).forEach((extra) => {
      const extraChip = element("a", "ref-chip", `${extra.label} ↗`);
      extraChip.href = extra.url;
      extraChip.target = "_blank";
      extraChip.rel = "noopener noreferrer";
      refChips.append(extraChip);
    });
  });
  sec6.append(refChips);
  report.append(sec6);

  const disclaimer = element("div", "report-disclaimer");
  disclaimer.append(element("strong", "", "Clinical Decision Support Disclaimer: "));
  disclaimer.append(document.createTextNode(diagnosis.disclaimer));
  report.append(disclaimer);

  const metadata = element("div", "report-meta");
  metadata.append(element("span", "", `Record ID: ${record.id}`));
  metadata.append(element("span", "", `Practitioner review: ${record.reviewer ? `${record.reviewer}${record.reviewedAt ? ` (${new Date(record.reviewedAt).toLocaleString()})` : ""}` : "Review pending"}`));
  metadata.append(element("span", "", `Generated: ${new Date().toLocaleString()}`));
  report.append(metadata);
  return report;
}

function renderReport(record) {
  document.querySelector("#report-subtitle").textContent = `${record.patientId} · ${record.date}`;
  const container = document.querySelector("#report-content");
  container.replaceChildren(buildReportArticleElement(record));
  showView("report");
}

function renderAllLivePatientReports({ includeSynthetic = false } = {}) {
  const container = document.querySelector("#report-content");
  container.replaceChildren();
  const liveBatch = generateBatchDiagnosisReports(assessments, { liveOnly: true, latestPerPatient: false });
  const allBatch = generateBatchDiagnosisReports(assessments, { liveOnly: false, latestPerPatient: false });
  const showingLiveOnly = liveBatch.length > 0 && !includeSynthetic;
  const activeBatch = showingLiveOnly ? liveBatch : allBatch;

  if (activeBatch.length === 0) {
    document.querySelector("#report-subtitle").textContent = "No saved patients in workspace";
    const emptyPanel = element("div", "panel report-sheet");
    const empty = element("div", "empty-state");
    empty.append(element("span", "empty-icon", "＋"));
    empty.append(element("h2", "", "No patient assessments saved yet"));
    empty.append(element("p", "", "Create a new assessment for a live patient (or load the synthetic samples from Overview) to generate diagnosis reports."));
    const startBtn = element("button", "button button-primary", "Start assessment");
    startBtn.type = "button";
    startBtn.addEventListener("click", () => showView("assessment"));
    empty.append(startBtn);
    emptyPanel.append(empty);
    container.append(emptyPanel);
    showView("report");
    return;
  }

  document.querySelector("#report-subtitle").textContent = showingLiveOnly
    ? `${liveBatch.length} live ${liveBatch.length === 1 ? "patient" : "patients"} · Parameter-based reports`
    : `${allBatch.length} ${allBatch.length === 1 ? "patient" : "patients"} (${liveBatch.length} live, ${allBatch.length - liveBatch.length} synthetic demo)`;

  const summaryBar = element("div", "panel batch-summary-bar");
  const summaryCopy = element("div");
  summaryCopy.append(element("strong", "", showingLiveOnly
    ? `Generated ${liveBatch.length} live patient diagnosis ${liveBatch.length === 1 ? "report" : "reports"}`
    : (liveBatch.length === 0
      ? `No live patients saved yet — showing ${allBatch.length} synthetic demo ${allBatch.length === 1 ? "report" : "reports"}`
      : `Generated ${allBatch.length} total diagnosis reports (${liveBatch.length} live + ${allBatch.length - liveBatch.length} synthetic)`)));
  summaryCopy.append(element("small", "", "Each report uses the patient's latest recorded assessment parameters. Print or download HTML to archive."));
  summaryBar.append(summaryCopy);

  if (liveBatch.length > 0 && allBatch.length > liveBatch.length) {
    const toggleBtn = element("button", "button button-secondary", includeSynthetic ? "Show live patients only" : "Include synthetic samples");
    toggleBtn.type = "button";
    toggleBtn.addEventListener("click", () => renderAllLivePatientReports({ includeSynthetic: !includeSynthetic }));
    summaryBar.append(toggleBtn);
  }
  container.append(summaryBar);

  activeBatch.forEach(({ record }) => {
    container.append(buildReportArticleElement(record));
  });
  showView("report");
}

function collectPortableCss() {
  const rules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) rules.push(rule.cssText);
    } catch {
      // Ignore cross-origin sheets if any.
    }
  }
  return rules.join("\n");
}

function downloadVisibleReportsHtml() {
  const container = document.querySelector("#report-content");
  if (!container || !container.children.length) return;
  const clone = container.cloneNode(true);
  clone.querySelectorAll(".batch-summary-bar").forEach((el) => el.remove());
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Careform — Patient Diagnosis Report</title>
<style>
${collectPortableCss()}
body { background: #f5f8f6; padding: 24px 16px; }
.export-shell { max-width: 960px; margin: 0 auto; display: grid; gap: 22px; }
@media print { body { padding: 0; background: #fff; } }
</style>
</head>
<body>
<div class="export-shell">${clone.innerHTML}</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "patient-diagnosis-reports.html";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showHistoryError(message) {
  const results = document.querySelector("#history-results");
  results.replaceChildren(element("div", "notice notice-error", message));
}

function searchHistory() {
  const patientId = normalizePatientId(document.querySelector("#history-search").value);
  const results = document.querySelector("#history-results");
  results.replaceChildren();
  if (!patientId) {
    showHistoryError("Enter a patient ID to search.");
    return;
  }
  const records = getPatientTimeline(assessments, patientId);
  if (records.length === 0) {
    const empty = element("div", "empty-state");
    empty.append(element("span", "empty-icon", "⌕"));
    empty.append(element("h2", "", "No matching assessments"));
    empty.append(element("p", "", `No saved records were found for patient ID ${patientId}. Check the ID and try again.`));
    results.append(empty);
    return;
  }
  const heading = element("div", "timeline-heading");
  const copy = element("div");
  copy.append(element("h2", "", records[0].patientName));
  copy.append(element("p", "", `${patientId} · ${records.length} ${records.length === 1 ? "visit" : "visits"}, newest first`));
  heading.append(copy);
  results.append(heading);
  const timeline = element("div", "timeline");
  records.forEach((record) => {
    const item = element("div", "timeline-item");
    item.append(element("div", "timeline-date", record.date));
    const text = element("div", "timeline-copy");
    text.append(element("strong", "", [record.color, record.coating].filter(Boolean).join(" · ") || "Observations not recorded"));
    const visitBmi = record.bmi ?? calculateBMI(record.heightCm, record.weightKg);
    const followUpSummary = [
      record.symptoms ? `Reported: ${record.symptoms}` : "",
      record.symptomDuration ? `Duration: ${record.symptomDuration}` : "",
      record.painScore ? `Pain: ${record.painScore}/10` : "",
      record.dryMouth ? `Dry mouth: ${record.dryMouth}` : "",
      record.country ? `Country / region: ${record.country}` : "",
      visitBmi !== null ? `BMI: ${visitBmi.toFixed(1)}` : "",
      record.otherFeatures || record.notes,
    ].filter(Boolean).join(" · ");
    text.append(element("p", "", followUpSummary || "No additional notes recorded."));
    const open = element("button", "record-open", "Open report");
    open.type = "button";
    open.addEventListener("click", () => renderReport(record));
    item.append(text, open);
    timeline.append(item);
  });
  results.append(timeline);
}

document.querySelectorAll("[data-view], [data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.view ?? button.dataset.go;
    if (name === "assessment" && form.elements.date && !form.elements.date.value) {
      form.elements.date.value = new Date().toISOString().slice(0, 10);
    }
    showView(name);
  });
});
document.querySelector("#search-button").addEventListener("click", searchHistory);
document.querySelector("#history-search").addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchHistory();
});
document.querySelector("#print-report").addEventListener("click", () => window.print());
document.querySelector("#download-report-html")?.addEventListener("click", downloadVisibleReportsHtml);
document.querySelector("#generate-all-reports")?.addEventListener("click", () => renderAllLivePatientReports());
document.querySelector("#history-generate-all")?.addEventListener("click", () => renderAllLivePatientReports());
document.querySelector("#load-synthetic-samples").addEventListener("click", () => {
  const sampleIds = new Set(syntheticSampleAssessments.map((record) => record.id));
  const hasExistingSamples = assessments.some((record) => record.isSynthetic && sampleIds.has(record.id));
  const otherAssessments = assessments.filter((record) => !(record.isSynthetic && sampleIds.has(record.id)));
  const status = document.querySelector("#sample-data-status");
  try {
    persistAssessments([...syntheticSampleAssessments, ...otherAssessments]);
    status.textContent = `${hasExistingSamples ? "Refreshed" : "Loaded"} ${syntheticSampleAssessments.length} fictional sample reports. Open any report to review the demonstration.`;
    status.hidden = false;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The synthetic sample records could not be loaded.";
    status.hidden = false;
  }
});
["heightCm", "weightKg", "age"].forEach((name) => {
  form.elements[name].addEventListener("input", updateBMIPreview);
});
form.addEventListener("input", updateDiagnosisPreview);
form.addEventListener("change", updateDiagnosisPreview);
document.querySelector("#generate-diagnosis-btn")?.addEventListener("click", updateDiagnosisPreview);
document.querySelector("#open-draft-report-btn")?.addEventListener("click", () => {
  renderReport(collectDraftRecordFromForm());
});
document.querySelector("#apply-diagnosis-btn")?.addEventListener("click", () => {
  const diagnosis = generateDiagnosticAssessment(collectDraftRecordFromForm());
  form.elements.clinicalImpression.value = diagnosis.primaryImpressions
    .map((item) => `${item.title} (${item.likelihood}): ${item.rationale}`)
    .join("\n");
  form.elements.testsConsidered.value = diagnosis.recommendedTests.join("\n");
  form.elements.practitionerPlan.value = [
    ...diagnosis.carePlan,
    "",
    "Suggested diet & nutritional guidance:",
    ...diagnosis.suggestedDiet.map((item) => `- ${item}`),
  ].join("\n");
});
updateBMIPreview();
updateDiagnosisPreview();
document.querySelector("#install-app").hidden = false;
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date());
form.elements.date.value = new Date().toISOString().slice(0, 10);

try {
  assessments = loadAssessments();
} catch (error) {
  storageWarning.textContent = error instanceof Error ? `Saved data could not be loaded: ${error.message}` : "Saved data could not be loaded.";
  storageWarning.hidden = false;
}
renderEvidence();
renderDashboard();
