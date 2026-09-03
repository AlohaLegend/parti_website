(function () {
  const form = document.querySelector("#project-inquiry-form");
  if (!form) return;

  const client = window.PARTI_SUPABASE?.client;
  const steps = [...form.querySelectorAll("[data-step]")];
  const progressItems = [...document.querySelectorAll("[data-progress]")];
  const review = document.querySelector("#inquiry-review");
  const status = document.querySelector("#inquiry-status");
  const draftKey = "parti-project-inquiry-draft-v1";
  let currentStep = 0;
  let submitting = false;

  const labels = {
    contact_name: "Contact", email: "Email", company: "Company", phone: "Phone",
    project_name: "Project", project_type: "Project type", location: "Location",
    event_date: "Target date", timing_flexibility: "Timing", budget_range: "Budget",
    budget_approved: "Budget status", project_stage: "Current stage", source: "Source",
    brief: "Brief", success_definition: "Success looks like", decision_process: "Approvals",
    partnership_interest: "Future event partnerships"
  };
  const displayValues = {
    under_100: "Under $100,000", "100_250": "$100,000–$250,000", "250_500": "$250,000–$500,000",
    "500_1m": "$500,000–$1,000,000", "1m_plus": "$1,000,000+", tbd: "Not established yet",
    approved: "Approved", range_approved: "Working range approved", seeking_approval: "Seeking approval",
    unknown: "Not established", early_idea: "Early idea / need strategy", brief_ready: "Brief is ready",
    creative_started: "Creative has started", design_approved: "Design is approved",
    production_ready: "Ready for production / fabrication", fixed: "Date is fixed",
    somewhat_flexible: "Some flexibility", not_set: "Date is not set"
  };

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function dataFromForm() {
    const raw = new FormData(form);
    return {
      contact_name: String(raw.get("contact_name") || "").trim(),
      email: String(raw.get("email") || "").trim().toLowerCase(),
      company: String(raw.get("company") || "").trim(),
      phone: String(raw.get("phone") || "").trim() || null,
      website: String(raw.get("website") || "").trim() || null,
      project_name: String(raw.get("project_name") || "").trim(),
      project_type: String(raw.get("project_type") || ""),
      location: String(raw.get("location") || "").trim(),
      event_date: String(raw.get("event_date") || "") || null,
      timing_flexibility: String(raw.get("timing_flexibility") || "not_set"),
      brief: String(raw.get("brief") || "").trim(),
      services: raw.getAll("services").map(String),
      success_definition: String(raw.get("success_definition") || "").trim() || null,
      budget_range: String(raw.get("budget_range") || ""),
      budget_approved: String(raw.get("budget_approved") || ""),
      project_stage: String(raw.get("project_stage") || ""),
      source: String(raw.get("source") || ""),
      decision_process: String(raw.get("decision_process") || "").trim() || null,
      source_detail: String(raw.get("source_detail") || "").trim() || null,
      partnership_interest: raw.get("partnership_interest") === "on"
    };
  }

  function saveDraft() {
    try { window.localStorage.setItem(draftKey, JSON.stringify(dataFromForm())); } catch (_error) {}
  }

  function restoreDraft() {
    let draft;
    try { draft = JSON.parse(window.localStorage.getItem(draftKey) || "null"); } catch (_error) { return; }
    if (!draft) return;
    Object.entries(draft).forEach(([name, value]) => {
      if (name === "services" && Array.isArray(value)) {
        form.querySelectorAll('input[name="services"]').forEach((input) => { input.checked = value.includes(input.value); });
        return;
      }
      const field = form.elements.namedItem(name);
      if (field && field.type === "checkbox" && typeof value === "boolean") {
        field.checked = value;
        return;
      }
      if (field && typeof value === "string") field.value = value;
    });
  }

  function updateProgress() {
    steps.forEach((step, index) => step.classList.toggle("is-active", index === currentStep));
    progressItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === currentStep);
      item.classList.toggle("is-complete", index < currentStep);
    });
    if (currentStep === steps.length - 1) renderReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fieldError(field, message) {
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const output = field.closest(".form-field")?.querySelector(".field-error");
    if (output) output.textContent = message;
  }

  function validateStep(index) {
    let valid = true;
    const step = steps[index];
    step.querySelectorAll("input[required], select[required], textarea[required]").forEach((field) => {
      if (field.type === "checkbox") return;
      let message = "";
      if (!field.value.trim()) message = "This field is required.";
      else if (field.type === "email" && !field.validity.valid) message = "Enter a valid email address.";
      else if (field.type === "url" && !field.validity.valid) message = "Enter a complete URL, including https://";
      fieldError(field, message);
      if (message) valid = false;
    });

    const serviceGroup = step.querySelector('[data-checkbox-group="services"]');
    if (serviceGroup) {
      const hasService = Boolean(serviceGroup.querySelector('input[name="services"]:checked'));
      const error = step.querySelector('[data-group-error="services"]');
      if (error) error.textContent = hasService ? "" : "Select at least one service.";
      valid = valid && hasService;
    }

    if (!valid) step.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function renderReview() {
    const data = dataFromForm();
    const entries = [
      ["contact_name", data.contact_name], ["email", data.email], ["company", data.company],
      ["project_name", data.project_name], ["project_type", data.project_type], ["location", data.location],
      ["event_date", data.event_date || "Not set"], ["timing_flexibility", displayValues[data.timing_flexibility]],
      ["budget_range", displayValues[data.budget_range]], ["budget_approved", displayValues[data.budget_approved]],
      ["project_stage", displayValues[data.project_stage]], ["source", data.source.replaceAll("_", " ")],
      ["services", data.services.join(" · ")], ["brief", data.brief],
      ["success_definition", data.success_definition], ["decision_process", data.decision_process],
      ["partnership_interest", data.partnership_interest ? "Interested" : null]
    ].filter(([, value]) => value);

    review.innerHTML = entries.map(([key, value]) => `
      <div class="detail-item ${["brief", "success_definition", "decision_process", "services", "partnership_interest"].includes(key) ? "detail-item-wide" : ""}">
        <span>${labels[key] || key.replaceAll("_", " ")}</span><p>${escapeHtml(value)}</p>
      </div>`).join("");
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  function scoreInquiry(data) {
    const budgetScores = { under_100: 14, "100_250": 24, "250_500": 31, "500_1m": 35, "1m_plus": 38, tbd: 4 };
    const approvalScores = { approved: 18, range_approved: 14, seeking_approval: 6, unknown: 0 };
    const stageScores = { early_idea: 7, brief_ready: 14, creative_started: 16, design_approved: 18, production_ready: 18 };
    let score = (budgetScores[data.budget_range] || 0) + (approvalScores[data.budget_approved] || 0) + (stageScores[data.project_stage] || 0);
    score += Math.min(data.services.length * 3, 12);
    if (data.event_date) {
      const days = (new Date(`${data.event_date}T12:00:00`) - new Date()) / 86400000;
      score += days >= 42 ? 10 : days >= 21 ? 4 : -8;
    } else score += 4;
    score = Math.max(0, Math.min(100, score));
    const recommended = data.budget_range === "tbd" || ["unknown", "seeking_approval"].includes(data.budget_approved) || data.project_stage === "early_idea"
      ? "discovery_recommended" : score >= 68 ? "consultation_ready" : "manual_review";
    return { score, recommended };
  }

  function attribution() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("utm_source"), medium: params.get("utm_medium"), campaign: params.get("utm_campaign"),
      content: params.get("utm_content"), referrer: document.referrer || null, landing_url: window.location.href
    };
  }

  function createReferenceCode() {
    const now = new Date();
    const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
    const bytes = new Uint8Array(3);
    window.crypto.getRandomValues(bytes);
    const suffix = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `PARTI-${date}-${suffix}`;
  }

  async function submitInquiry(event) {
    event.preventDefault();
    if (submitting || !validateStep(currentStep)) return;

    const consent = form.elements.namedItem("consent");
    const consentError = form.querySelector("[data-consent-error]");
    if (!consent.checked) {
      consentError.textContent = "Confirm the information before sending.";
      consent.focus();
      return;
    }
    consentError.textContent = "";

    if (form.elements.namedItem("office_fax").value) {
      window.location.replace("inquiry-received.html");
      return;
    }
    if (!client) {
      setStatus("The secure inquiry connection is unavailable. Please try again shortly.", "error");
      return;
    }

    submitting = true;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    setStatus("Sending your project securely to PARTI…");

    const data = dataFromForm();
    const scored = scoreInquiry(data);
    const referenceCode = createReferenceCode();
    const payload = { ...data, reference_code: referenceCode, fit_score: scored.score, recommended_path: scored.recommended, attribution: attribution() };
    const { error } = await client.from("inquiries").insert(payload);

    if (error) {
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = "Send to PARTI";
      setStatus("We could not send the inquiry yet. Your draft is still saved on this device. Please try again.", "error");
      return;
    }

    window.localStorage.removeItem(draftKey);
    window.sessionStorage.setItem("parti-inquiry-reference", referenceCode);
    setStatus("Received. Opening your confirmation…", "success");
    window.location.assign("inquiry-received.html");
  }

  form.addEventListener("input", (event) => { fieldError(event.target, ""); saveDraft(); });
  form.addEventListener("change", saveDraft);
  form.addEventListener("submit", submitInquiry);
  form.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1); updateProgress(); saveDraft();
  }));
  form.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    currentStep = Math.max(currentStep - 1, 0); updateProgress();
  }));

  restoreDraft();
  updateProgress();
})();
