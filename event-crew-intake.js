(function () {
  const form = document.querySelector("#event-crew-form");
  if (!form) return;

  const client = window.PARTI_SUPABASE?.client;
  const steps = [...form.querySelectorAll("[data-crew-step]")];
  const progressItems = [...document.querySelectorAll("[data-crew-progress]")];
  const review = document.querySelector("#event-crew-review");
  const status = document.querySelector("#event-crew-status");
  const params = new URLSearchParams(location.search);
  const draftKey = "parti-event-crew-intake-draft-v1";
  const submittedKey = "parti-event-crew-last-submit";
  let currentStep = 0;
  let submitting = false;

  const text = (raw, name) => String(raw.get(name) || "").trim();
  const nullable = (value) => value || null;
  const list = (raw, name) => raw.getAll(name).map(String);
  const escapeHtml = (value) => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };
  const display = (value) => ({
    same_day: "Same day when available", one_day: "At least 1 day", three_days: "At least 3 days", one_week: "At least 1 week",
    schedule_dependent: "Depends on the schedule", comfortable: "Comfortable when a shift requires it", yes: "Yes", no: "No", limited: "Limited availability", discuss: "Discuss per project",
    local: "Los Angeles area", regional: "Regional or overnight", national: "Domestic travel", experienced: "Yes, relevant experience", training_needed: "Potentially, with orientation or training",
    sometimes: "Sometimes, depending on the run", task_details: "Needs specific task details", role_details: "Needs specific shift details", none: "No regular experience", basic: "Basic, supervised use", tool_comfortable: "Comfortable with common install tools", advanced: "Advanced, independent build and install work"
  }[value] || String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));

  function dataFromForm() {
    const raw = new FormData(form);
    const roles = list(raw, "crew_roles");
    const otherRole = text(raw, "other_role");
    if (otherRole && roles.includes("Other")) roles[roles.indexOf("Other")] = otherRole;
    const experience = text(raw, "experience_summary");
    const availability = text(raw, "availability");
    const hourlyRate = text(raw, "hourly_rate");
    const minimumCall = text(raw, "minimum_call");
    const rateNotes = text(raw, "rate_notes");
    const sayYes = text(raw, "say_yes");
    return {
      legal_name: text(raw, "legal_name"), preferred_name: nullable(text(raw, "preferred_name")),
      email: text(raw, "email").toLowerCase(), phone: text(raw, "phone"), location: text(raw, "location"),
      profile_url: nullable(text(raw, "profile_url")), role_title: "Event crew", employment_type: "part_time",
      worked_with_parti: text(raw, "worked_with_parti") === "yes", parti_capacity: nullable(text(raw, "parti_capacity")),
      start_date: text(raw, "start_date"), role_questions: null,
      role_snapshot: {
        intake_track: "event_crew", title: "Event crew network", responsibilities: roles.join(" · "), reports_to: "PARTI project lead",
        location: "Confirmed per shift", schedule: availability, pay_range: "Confirmed per shift", benefits: "Confirmed by PARTI when applicable", missing_fields: []
      },
      contribution: {
        day_one_ownership: experience, support_needed: availability, growth_areas: null,
        success_90_days: "Reliable, safe, prepared event crew support on confirmed shifts.",
        representative_work: nullable(text(raw, "recent_project")), work_environments: roles,
        feedback_preferences: "Clear shift scope, call time, onsite lead, safety expectations, and checkout instructions.", future_responsibility: null
      },
      compensation: {
        type: "hourly", desired: hourlyRate, priorities: ["Hourly rate"],
        essential_now: [minimumCall ? `Preferred minimum call: ${minimumCall}` : "", rateNotes].filter(Boolean).join(" · "),
        negotiable_now: null, review_later: null, structure_preferences: nullable(rateNotes), incentive_targets: [], long_term_goals: null
      },
      working_conditions: {
        arrangement: "field_onsite", travel_comfort: text(raw, "travel_comfort"), nights_weekends: text(raw, "nights_weekends"),
        schedule_constraints: availability, equipment_needed: nullable(text(raw, "equipment")),
        current_commitments: `Notice: ${display(text(raw, "lead_time"))} · Transportation: ${display(text(raw, "transportation"))}`,
        restrictive_agreement: "no", agreement_summary: null,
        crew_roles: roles, certifications: list(raw, "certifications"), lead_time: text(raw, "lead_time"), transportation: text(raw, "transportation"),
        essential_requirements: text(raw, "essential_requirements"), minimum_call: minimumCall,
        driver_5_ton: nullable(text(raw, "driver_5_ton")), personal_vehicle: nullable(text(raw, "personal_vehicle")),
        lift_50: nullable(text(raw, "lift_50")), hand_tool_proficiency: nullable(text(raw, "hand_tool_proficiency")),
        hand_tools_detail: nullable(text(raw, "hand_tools_detail"))
      },
      decision_factors: {
        say_yes: sayYes, decline_reasons: nullable(text(raw, "decline_reasons")), acceptance_questions: null,
        alternatives: ["Future crew shift"], decision_deadline: null, sensitive_live: "no",
        additional_context: nullable(text(raw, "additional_context"))
      }
    };
  }

  function setConditionalSection(section, visible) {
    section.hidden = !visible;
    section.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !visible;
      field.required = visible && field.hasAttribute("data-required");
      if (!visible) fieldError(field, "");
    });
  }

  function syncConditionalQuestions() {
    const roles = [...form.querySelectorAll('input[name="crew_roles"]:checked')].map((field) => field.value);
    setConditionalSection(form.querySelector("[data-driver-details]"), roles.includes("Runner and driver"));
    setConditionalSection(form.querySelector("[data-build-readiness]"), roles.some((role) => ["Load-in and strike", "Fabrication and install support"].includes(role)));
  }

  function fieldError(field, message) {
    if (!field) return;
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const output = field.closest(".form-field")?.querySelector(".field-error");
    if (output) output.textContent = message;
  }

  function validateStep(index) {
    const step = steps[index];
    let valid = true;
    step.querySelectorAll("input[required], select[required], textarea[required]").forEach((field) => {
      if (field.type === "checkbox") return;
      let message = "";
      if (!field.value.trim()) message = "This field is required.";
      else if (field.minLength > 0 && field.value.trim().length < field.minLength) message = `Enter at least ${field.minLength} characters.`;
      else if (!field.validity.valid) message = field.type === "email" ? "Enter a valid email address." : field.type === "url" ? "Enter a complete URL, including https://" : "Check this value.";
      fieldError(field, message);
      if (message) valid = false;
    });
    step.querySelectorAll("[data-checkbox-group]").forEach((group) => {
      const name = group.dataset.checkboxGroup;
      const count = group.querySelectorAll(`input[name="${name}"]:checked`).length;
      const output = step.querySelector(`[data-group-error="${name}"]`);
      const message = count ? "" : "Select at least one option.";
      if (output) output.textContent = message;
      if (message) valid = false;
    });
    if (index === 0) {
      const prior = form.elements.namedItem("worked_with_parti");
      const capacity = form.elements.namedItem("parti_capacity");
      const roles = [...form.querySelectorAll('input[name="crew_roles"]:checked')].map((field) => field.value);
      const other = form.elements.namedItem("other_role");
      if (prior.value === "yes" && !capacity.value.trim()) { fieldError(capacity, "Tell us how you worked with PARTI."); valid = false; }
      if (roles.includes("Other") && !other.value.trim()) { fieldError(other, "Describe the other crew skill."); valid = false; }
    }
    if (!valid) step.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function saveDraftComplete() {
    try {
      const raw = Object.fromEntries(new FormData(form).entries());
      raw.crew_roles = [...form.querySelectorAll('input[name="crew_roles"]:checked')].map((field) => field.value);
      raw.certifications = [...form.querySelectorAll('input[name="certifications"]:checked')].map((field) => field.value);
      localStorage.setItem(draftKey, JSON.stringify(raw));
    } catch (_error) {}
  }

  function restoreDraft() {
    let data;
    try { data = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch (_error) { return; }
    if (!data) return;
    ["crew_roles", "certifications"].forEach((name) => {
      const selected = Array.isArray(data[name]) ? data[name] : [];
      form.querySelectorAll(`input[name="${name}"]`).forEach((field) => { field.checked = selected.includes(field.value); });
    });
    Object.entries(data).forEach(([name, value]) => {
      if (["crew_roles", "certifications"].includes(name) || typeof value !== "string") return;
      const field = form.elements.namedItem(name);
      if (field && field.type !== "checkbox") field.value = value;
    });
  }

  function renderReview() {
    const raw = new FormData(form);
    const data = dataFromForm();
    const working = data.working_conditions;
    const entries = [
      ["Crew member", data.preferred_name ? `${data.legal_name} · ${data.preferred_name}` : data.legal_name],
      ["Contact", `${data.email} · ${data.phone}`], ["Home base", data.location],
      ["Crew roles", working.crew_roles.join(" · "), true], ["Experience", data.contribution.day_one_ownership, true],
      ["Availability", data.contribution.support_needed, true], ["Earliest date", data.start_date],
      ["Notice needed", display(working.lead_time)], ["Nights + weekends", display(data.working_conditions.nights_weekends)],
      ["Travel", display(data.working_conditions.travel_comfort)], ["Transportation", display(working.transportation)],
      ["5-ton driving", working.driver_5_ton ? display(working.driver_5_ton) : null], ["Personal vehicle for runs", working.personal_vehicle ? display(working.personal_vehicle) : null],
      ["Desired hourly rate", data.compensation.desired],
      ["Minimum call", working.minimum_call], ["Certifications", working.certifications.join(" · "), true],
      ["50 lb shift task", working.lift_50 ? display(working.lift_50) : null], ["Hand-tool proficiency", working.hand_tool_proficiency ? display(working.hand_tool_proficiency) : null],
      ["Hand tools", working.hand_tools_detail, true], ["Essential requirements", display(working.essential_requirements)], ["Booking essentials", data.decision_factors.say_yes, true],
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

  function createReferenceCode() {
    const now = new Date();
    const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
    const bytes = new Uint8Array(3); crypto.getRandomValues(bytes);
    return `CREW-${date}-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }

  async function submitIntake(event) {
    event.preventDefault();
    if (submitting || !validateStep(currentStep)) return;
    const consents = [form.elements.namedItem("accuracy_consent"), form.elements.namedItem("notice_consent")];
    const consentError = form.querySelector("[data-consent-error]");
    if (consents.some((field) => !field.checked)) { consentError.textContent = "Confirm both acknowledgements before sending."; consents.find((field) => !field.checked)?.focus(); return; }
    consentError.textContent = "";
    if (form.elements.namedItem("office_fax").value) { location.replace("employee-received.html"); return; }
    if (!client) { status.textContent = "The secure intake connection is unavailable. Please try again shortly."; status.dataset.tone = "error"; return; }
    const lastSubmit = Number(localStorage.getItem(submittedKey) || 0);
    if (Date.now() - lastSubmit < 60000) { status.textContent = "A crew profile was just sent from this device. Wait one minute before trying again."; status.dataset.tone = "error"; return; }
    submitting = true;
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Sending...";
    status.textContent = "Sending your crew profile securely to PARTI..."; status.dataset.tone = "";
    const referenceCode = createReferenceCode();
    const payload = {
      ...dataFromForm(), reference_code: referenceCode,
      attribution: { source: params.get("utm_source"), campaign: params.get("utm_campaign"), referrer: document.referrer || null, landing_url: location.href, relationship_interest: "event_crew" }
    };
    const { error } = await client.from("employee_intakes").insert(payload);
    if (error) { submitting = false; button.disabled = false; button.textContent = "Send crew profile to PARTI"; status.textContent = "We could not send the profile yet. Your draft is still saved on this device. Please try again."; status.dataset.tone = "error"; return; }
    localStorage.removeItem(draftKey); localStorage.setItem(submittedKey, String(Date.now()));
    sessionStorage.setItem("parti-employee-reference", referenceCode); sessionStorage.setItem("parti-intake-track", "event_crew");
    status.textContent = "Received. Opening your confirmation..."; status.dataset.tone = "success";
    location.assign("employee-received.html");
  }

  form.addEventListener("input", (event) => { fieldError(event.target, ""); saveDraftComplete(); });
  form.addEventListener("change", (event) => {
    if (event.target.name === "crew_roles") syncConditionalQuestions();
    if (event.target.name === "certifications" && event.target.checked) {
      form.querySelectorAll('input[name="certifications"]').forEach((field) => {
        if (event.target.value === "None listed" ? field !== event.target : field.value === "None listed") field.checked = false;
      });
    }
    saveDraftComplete();
  });
  form.addEventListener("submit", submitIntake);
  form.querySelectorAll("[data-crew-next]").forEach((button) => button.addEventListener("click", () => { if (!validateStep(currentStep)) return; currentStep = Math.min(currentStep + 1, steps.length - 1); updateProgress(); saveDraftComplete(); }));
  form.querySelectorAll("[data-crew-back]").forEach((button) => button.addEventListener("click", () => { currentStep = Math.max(currentStep - 1, 0); updateProgress(); }));
  const today = new Date().toISOString().slice(0, 10); form.elements.namedItem("start_date").min = today;
  restoreDraft(); syncConditionalQuestions(); updateProgress();
})();
