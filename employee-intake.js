(function () {
  const form = document.querySelector("#employee-intake-form");
  if (!form) return;

  const client = window.PARTI_SUPABASE?.client;
  const steps = [...form.querySelectorAll("[data-step]")];
  const progressItems = [...document.querySelectorAll("[data-progress]")];
  const review = document.querySelector("#employee-review");
  const status = document.querySelector("#employee-status");
  const briefing = document.querySelector("#role-briefing");
  const warning = document.querySelector("#role-warning");
  const pathSelector = document.querySelector("#intake-path-selector");
  const startIntake = document.querySelector("#start-intake");
  const pathError = document.querySelector("#path-error");
  const progress = document.querySelector("#employee-progress");
  const eyebrow = document.querySelector("#intake-eyebrow");
  const heading = document.querySelector("#intake-heading");
  const lead = document.querySelector("#intake-lead");
  const notice = document.querySelector("#intake-notice");
  const draftKey = "parti-employee-intake-draft-v1";
  const submittedKey = "parti-employee-intake-last-submit";
  let currentStep = 0;
  let submitting = false;

  const params = new URLSearchParams(location.search);
  const roleSnapshot = {
    title: params.get("role") || "",
    responsibilities: params.get("responsibilities") || "",
    reports_to: params.get("reports_to") || "",
    location: params.get("work_location") || "",
    schedule: params.get("schedule") || "",
    pay_range: params.get("pay") || "",
    benefits: params.get("benefits") || ""
  };
  const roleFields = [
    ["Role", "title"], ["Essential responsibilities", "responsibilities"], ["Reports to", "reports_to"],
    ["Work location", "location"], ["Expected schedule", "schedule"], ["Approved pay range", "pay_range"],
    ["Benefits currently available", "benefits"]
  ];
  const missingRoleFields = roleFields.filter(([, key]) => !roleSnapshot[key]).map(([label]) => label);
  const hasRoleBrief = roleFields.some(([, key]) => roleSnapshot[key]);

  const displayValues = {
    full_time: "Full-time", part_time: "Part-time", either: "Either", salary: "Annual salary", hourly: "Hourly",
    discuss_range: "Discuss after reviewing approved range", studio_office: "Studio or office", hybrid: "Hybrid",
    remote: "Remote", role_dependent: "Role-dependent", none: "None", occasional: "Occasional", regular: "Regular",
    extensive: "Extensive", yes: "Yes", no: "No", limited: "Limited availability", discuss: "Discuss"
  };

  const text = (raw, name) => String(raw.get(name) || "").trim();
  const nullable = (value) => value || null;
  const list = (raw, name) => raw.getAll(name).map(String);
  const display = (value) => displayValues[value] || String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const escapeHtml = (value) => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };

  function contractorUrl() {
    const url = new URL("contractor-onboarding.html", location.href);
    params.forEach((value, key) => {
      if (key.startsWith("utm_") || key === "ref") url.searchParams.set(key, value);
    });
    url.searchParams.set("unified", "1");
    return url.href;
  }

  function showEmployeeIntake() {
    pathSelector.hidden = true;
    form.hidden = false;
    progress.hidden = false;
    eyebrow.textContent = "Employee conversation";
    heading.textContent = "Do your best work.";
    lead.textContent = "Help build what is next. This intake gives PARTI and you a clear view of the role, expectations, priorities, and possible terms before anyone prepares an offer.";
    notice.innerHTML = "<strong>Important</strong><p>This is not an offer, employment agreement, benefit guarantee, or waiver. Do not enter a Social Security number, bank information, medical information, identity document, or criminal history here.</p>";
    params.set("relationship", "employee");
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
    updateProgress();
    form.querySelector("input:not([type='hidden']), select, textarea")?.focus();
  }

  function showPathSelector() {
    currentStep = 0;
    pathSelector.hidden = false;
    form.hidden = true;
    progress.hidden = true;
    eyebrow.textContent = "People intake";
    heading.textContent = "Find your path.";
    lead.textContent = "Start in one place. Tell us whether you are discussing an employee role or offering independent project services, and we will show only the questions that apply.";
    notice.innerHTML = "<strong>Important</strong><p>This intake is not an offer, booking, employment agreement, contractor agreement, benefit guarantee, or waiver. Do not enter tax IDs, bank information, medical information, identity documents, or criminal history here.</p>";
    params.delete("relationship");
    history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderRoleBriefing() {
    briefing.innerHTML = roleFields.map(([label, key]) => {
      const value = roleSnapshot[key];
      const fallback = key === "pay_range" ? "Not provided. Ask PARTI for the approved range." : key === "benefits" ? "No currently approved benefits were provided in this link." : "Not provided by PARTI.";
      return `<div class="role-briefing-item ${value ? "" : "is-missing"}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value || fallback)}</p></div>`;
    }).join("");
    warning.hidden = missingRoleFields.length === 0;
    if (roleSnapshot.title) form.elements.namedItem("role_title").value = roleSnapshot.title;
  }

  function dataFromForm() {
    const raw = new FormData(form);
    return {
      legal_name: text(raw, "legal_name"), preferred_name: nullable(text(raw, "preferred_name")),
      email: text(raw, "email").toLowerCase(), phone: text(raw, "phone"), location: text(raw, "location"),
      profile_url: nullable(text(raw, "profile_url")), role_title: text(raw, "role_title"), employment_type: text(raw, "employment_type"),
      worked_with_parti: text(raw, "worked_with_parti") === "yes", parti_capacity: nullable(text(raw, "parti_capacity")),
      start_date: text(raw, "start_date"), role_questions: nullable(text(raw, "role_questions")),
      role_snapshot: { ...roleSnapshot, missing_fields: missingRoleFields },
      contribution: {
        day_one_ownership: text(raw, "day_one_ownership"), support_needed: text(raw, "support_needed"),
        growth_areas: nullable(text(raw, "growth_areas")), success_90_days: text(raw, "success_90_days"),
        representative_work: text(raw, "representative_work"), work_environments: list(raw, "work_environments"),
        feedback_preferences: text(raw, "feedback_preferences"), future_responsibility: nullable(text(raw, "future_responsibility"))
      },
      compensation: {
        type: text(raw, "compensation_type"), desired: nullable(text(raw, "desired_compensation")), priorities: list(raw, "priorities"),
        essential_now: text(raw, "essential_now"), negotiable_now: nullable(text(raw, "negotiable_now")),
        review_later: nullable(text(raw, "review_later")), structure_preferences: nullable(text(raw, "structure_preferences")),
        incentive_targets: list(raw, "incentive_targets"), long_term_goals: nullable(text(raw, "long_term_goals"))
      },
      working_conditions: {
        arrangement: text(raw, "work_arrangement"), travel_comfort: text(raw, "travel_comfort"),
        nights_weekends: text(raw, "nights_weekends"), schedule_constraints: nullable(text(raw, "schedule_constraints")),
        equipment_needed: nullable(text(raw, "equipment_needed")), current_commitments: nullable(text(raw, "current_commitments")),
        restrictive_agreement: text(raw, "restrictive_agreement"), agreement_summary: nullable(text(raw, "agreement_summary"))
      },
      decision_factors: {
        say_yes: text(raw, "say_yes"), decline_reasons: text(raw, "decline_reasons"),
        acceptance_questions: nullable(text(raw, "acceptance_questions")), alternatives: list(raw, "alternatives"),
        decision_deadline: nullable(text(raw, "decision_deadline")), sensitive_live: text(raw, "sensitive_live"),
        additional_context: nullable(text(raw, "additional_context"))
      }
    };
  }

  function fieldError(field, message) {
    if (!field) return;
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const output = field.closest(".form-field")?.querySelector(".field-error");
    if (output) output.textContent = message;
  }
  function setStatus(message, tone = "") { status.textContent = message; status.dataset.tone = tone; }

  function validateStep(index) {
    const step = steps[index];
    let valid = true;
    step.querySelectorAll("input[required], select[required], textarea[required]").forEach((field) => {
      if (field.type === "checkbox") return;
      let message = "";
      if (!field.value.trim()) message = "This field is required.";
      else if (field.minLength > 0 && field.value.trim().length < field.minLength) message = `Enter at least ${field.minLength} characters.`;
      else if (!field.validity.valid) message = field.type === "email" ? "Enter a valid email address." : field.type === "url" ? "Enter a complete URL, including https://" : "Check this value.";
      fieldError(field, message); if (message) valid = false;
    });
    step.querySelectorAll("[data-checkbox-group]").forEach((group) => {
      const name = group.dataset.checkboxGroup;
      const count = group.querySelectorAll(`input[name="${name}"]:checked`).length;
      const max = Number(group.dataset.max || 0);
      const output = step.querySelector(`[data-group-error="${name}"]`);
      let message = count ? "" : "Select at least one option.";
      if (max && count > max) message = `Select no more than ${max}.`;
      if (output) output.textContent = message;
      if (message) valid = false;
    });
    if (index === 0) {
      const prior = form.elements.namedItem("worked_with_parti");
      const capacity = form.elements.namedItem("parti_capacity");
      if (prior.value === "yes" && !capacity.value.trim()) { fieldError(capacity, "Tell us how you worked with PARTI."); valid = false; }
    }
    if (index === 3) {
      const agreement = form.elements.namedItem("restrictive_agreement");
      const summary = form.elements.namedItem("agreement_summary");
      if (["yes", "unsure"].includes(agreement.value) && !summary.value.trim()) { fieldError(summary, "Add a high-level description so PARTI knows what to review."); valid = false; }
    }
    if (!valid) step.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function saveDraft() { try { localStorage.setItem(draftKey, JSON.stringify(dataFromForm())); } catch (_error) {} }
  function restoreDraft() {
    let data; try { data = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch (_error) { return; }
    if (!data) return;
    const flattened = {
      ...data, ...data.contribution, ...data.working_conditions, ...data.decision_factors,
      compensation_type: data.compensation?.type, desired_compensation: data.compensation?.desired,
      essential_now: data.compensation?.essential_now, negotiable_now: data.compensation?.negotiable_now,
      review_later: data.compensation?.review_later, structure_preferences: data.compensation?.structure_preferences,
      long_term_goals: data.compensation?.long_term_goals, work_arrangement: data.working_conditions?.arrangement,
      worked_with_parti: data.worked_with_parti ? "yes" : "no"
    };
    const arrays = {
      work_environments: data.contribution?.work_environments || [], priorities: data.compensation?.priorities || [],
      incentive_targets: data.compensation?.incentive_targets || [], alternatives: data.decision_factors?.alternatives || []
    };
    Object.entries(arrays).forEach(([name, selected]) => form.querySelectorAll(`input[name="${name}"]`).forEach((field) => { field.checked = selected.includes(field.value); }));
    Object.entries(flattened).forEach(([name, value]) => {
      if (Object.hasOwn(arrays, name)) return;
      const field = form.elements.namedItem(name); if (field && (typeof value === "string" || typeof value === "number")) field.value = value;
    });
    if (roleSnapshot.title) form.elements.namedItem("role_title").value = roleSnapshot.title;
  }

  function renderReview() {
    const data = dataFromForm();
    const entries = [
      ["Candidate", data.preferred_name ? `${data.legal_name} · ${data.preferred_name}` : data.legal_name], ["Contact", `${data.email} · ${data.phone}`],
      ["Location", data.location], ["Role", data.role_title], ["Opportunity type", display(data.employment_type)],
      ["Prior PARTI work", data.worked_with_parti ? data.parti_capacity : "No"], ["Realistic start", data.start_date],
      ["Day-one ownership", data.contribution.day_one_ownership, true], ["Support needed", data.contribution.support_needed, true],
      ["90-day success", data.contribution.success_90_days, true], ["Work environments", data.contribution.work_environments.join(" · "), true],
      ["Compensation", `${display(data.compensation.type)}${data.compensation.desired ? ` · ${data.compensation.desired}` : ""}`],
      ["Top priorities", data.compensation.priorities.join(" · "), true], ["Essential now", data.compensation.essential_now, true],
      ["Work arrangement", display(data.working_conditions.arrangement)], ["Travel", display(data.working_conditions.travel_comfort)],
      ["Nights and weekends", display(data.working_conditions.nights_weekends)], ["Would say yes", data.decision_factors.say_yes, true],
      ["Would decline", data.decision_factors.decline_reasons, true], ["Alternatives", data.decision_factors.alternatives.join(" · "), true],
      ["Additional context", data.decision_factors.additional_context, true]
    ].filter(([, value]) => value);
    review.innerHTML = entries.map(([label, value, wide]) => `<div class="detail-item ${wide ? "detail-item-wide" : ""}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`).join("");
  }

  function updateProgress() {
    steps.forEach((step, index) => step.classList.toggle("is-active", index === currentStep));
    progressItems.forEach((item, index) => { item.classList.toggle("is-active", index === currentStep); item.classList.toggle("is-complete", index < currentStep); });
    if (currentStep === steps.length - 1) renderReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function attribution() { return { source: params.get("utm_source"), campaign: params.get("utm_campaign"), referrer: document.referrer || null, landing_url: location.href, relationship_interest: "employee" }; }
  function createReferenceCode() { const now = new Date(); const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`; const bytes = new Uint8Array(3); crypto.getRandomValues(bytes); return `CAREER-${date}-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`; }

  async function submitIntake(event) {
    event.preventDefault(); if (submitting || !validateStep(currentStep)) return;
    const consents = [form.elements.namedItem("accuracy_consent"), form.elements.namedItem("notice_consent")];
    const consentError = form.querySelector("[data-consent-error]");
    if (consents.some((field) => !field.checked)) { consentError.textContent = "Confirm both acknowledgements before sending."; consents.find((field) => !field.checked)?.focus(); return; }
    consentError.textContent = "";
    if (form.elements.namedItem("office_fax").value) { location.replace("employee-received.html"); return; }
    if (!client) { setStatus("The secure intake connection is unavailable. Please try again shortly.", "error"); return; }
    const lastSubmit = Number(localStorage.getItem(submittedKey) || 0);
    if (Date.now() - lastSubmit < 60000) { setStatus("An intake was just sent from this device. Wait one minute before trying again.", "error"); return; }
    submitting = true;
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Sending..."; setStatus("Sending your intake securely to PARTI...");
    const referenceCode = createReferenceCode();
    const payload = { ...dataFromForm(), reference_code: referenceCode, attribution: attribution() };
    const { error } = await client.from("employee_intakes").insert(payload);
    if (error) { submitting = false; button.disabled = false; button.textContent = "Send intake to PARTI"; setStatus("We could not send the intake yet. Your draft is still saved on this device. Please try again.", "error"); return; }
    localStorage.removeItem(draftKey); localStorage.setItem(submittedKey, String(Date.now())); sessionStorage.setItem("parti-employee-reference", referenceCode);
    setStatus("Received. Opening your confirmation...", "success"); location.assign("employee-received.html");
  }

  form.addEventListener("input", (event) => { fieldError(event.target, ""); saveDraft(); });
  form.addEventListener("change", (event) => {
    if (event.target.name === "priorities" && event.target.checked) {
      const selected = form.querySelectorAll('input[name="priorities"]:checked');
      if (selected.length > 5) { event.target.checked = false; form.querySelector('[data-group-error="priorities"]').textContent = "Select no more than 5."; }
    }
    if (event.target.name === "alternatives" && event.target.checked) {
      form.querySelectorAll('input[name="alternatives"]').forEach((field) => {
        if (event.target.value === "No alternative" ? field !== event.target : field.value === "No alternative") field.checked = false;
      });
    }
    saveDraft();
  });
  form.addEventListener("submit", submitIntake);
  form.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => { if (!validateStep(currentStep)) return; currentStep = Math.min(currentStep + 1, steps.length - 1); updateProgress(); saveDraft(); }));
  form.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => { currentStep = Math.max(currentStep - 1, 0); updateProgress(); }));
  form.querySelectorAll("[data-change-path]").forEach((button) => button.addEventListener("click", showPathSelector));
  startIntake.addEventListener("click", () => {
    const selected = document.querySelector('input[name="intake_path"]:checked')?.value;
    if (!selected) { pathError.textContent = "Choose the closest working relationship to continue."; document.querySelector('input[name="intake_path"]')?.focus(); return; }
    pathError.textContent = "";
    if (selected === "contractor") { location.assign(contractorUrl()); return; }
    showEmployeeIntake();
  });
  document.querySelectorAll('input[name="intake_path"]').forEach((field) => field.addEventListener("change", () => { pathError.textContent = ""; }));
  const today = new Date().toISOString().slice(0, 10); form.elements.namedItem("start_date").min = today; form.elements.namedItem("decision_deadline").min = today;
  renderRoleBriefing(); restoreDraft();
  if (params.get("relationship") === "contractor") location.replace(contractorUrl());
  else if (params.get("relationship") === "employee" || hasRoleBrief) showEmployeeIntake();
  else showPathSelector();
})();
