const { buildReportSections, createAssessmentRecord, getPatientTimeline, normalizePatientId, validateAssessment } = window.AssessmentDomain;
const healthEvidence = window.HealthEvidence;

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
  const titles = { dashboard: "Overview", assessment: "New assessment", history: "Patient history", evidence: "Evidence & guidance", report: "Assessment report" };
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
  document.querySelector("#review-count").textContent = String(assessments.filter((record) => !record.reviewedAt).length);
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
  currentImageDataUrl = "";
  preview.hidden = true;
  showFormError("");
  renderReport(record);
});

function reportSection(section) {
  const wrapper = element("section", "report-section");
  wrapper.append(element("h3", "", section.title));
  section.lines.forEach((line) => wrapper.append(element("p", "", line)));
  return wrapper;
}

function renderReport(record) {
  document.querySelector("#report-subtitle").textContent = `${record.patientId} · ${record.date}`;
  const report = document.querySelector("#report-content");
  report.replaceChildren();
  const header = element("div", "report-topline");
  const title = element("div");
  title.append(element("h2", "", "Tongue observation record"));
  title.append(element("p", "", "Descriptive observations and patient-provided context"));
  const status = element("div", "report-status");
  status.append(statusPill(record));
  header.append(title, status);
  report.append(header);

  const grid = element("div", "report-grid");
  buildReportSections(record).forEach((section) => grid.append(reportSection(section)));
  const imageSection = element("section", "report-section");
  imageSection.append(element("h3", "", "Image reference"));
  if (record.imageDataUrl) {
    const image = document.createElement("img");
    image.src = record.imageDataUrl;
    image.alt = "Tongue image provided for this observation record";
    imageSection.append(image);
  } else {
    imageSection.append(element("p", "", "No saved image."));
  }
  grid.append(imageSection);
  report.append(grid);

  const disclaimer = element("div", "report-disclaimer");
  disclaimer.append(element("strong", "", "Clinical decision support only — not a diagnosis. "));
  disclaimer.append(document.createTextNode("Visual observations and patient-provided context are documented separately from any clinical impression, tests or plan entered by the practitioner. The prototype does not infer diagnoses, recommend investigations or provide treatment advice. Image quality, lighting and capture conditions may limit interpretation. A qualified practitioner must review the original image, full clinical context and report and determine any appropriate next steps."));
  report.append(disclaimer);
  const metadata = element("div", "report-meta");
  metadata.append(element("span", "", `Record ID: ${record.id}`));
  metadata.append(element("span", "", `Practitioner: ${record.reviewer || "Review pending"}`));
  metadata.append(element("span", "", `Saved: ${new Date(record.createdAt).toLocaleString()}`));
  report.append(metadata);
  showView("report");
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
    text.append(element("p", "", record.otherFeatures || record.notes || "No additional notes recorded."));
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
