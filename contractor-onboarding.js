(function () {
  const form = document.querySelector("#contractor-onboarding-form");
  if (!form) return;

  const client = window.PARTI_SUPABASE?.client;
  const steps = [...form.querySelectorAll("[data-step]")];
  const progressItems = [...document.querySelectorAll("[data-progress]")];
  const review = document.querySelector("#contractor-review");
  const status = document.querySelector("#contractor-status");
  const draftKey = "parti-contractor-profile-draft-v1";
  const submittedKey = "parti-contractor-profile-last-submit";
  let currentStep = 0;
  let submitting = false;

  const displayValues = {
    sole_proprietor: "Sole proprietor", single_member_llc: "Single-member LLC", llc: "LLC",
    partnership: "Partnership", corporation: "Corporation", other: "Other established business",
    not_established: "Business not established", under_2: "Under 2 years", "2_4": "2 to 4 years",
    "5_9": "5 to 9 years", "10_plus": "10+ years", due_on_receipt: "Due on receipt",
    net_7: "Net 7", net_15: "Net 15", net_30: "Net 30", milestone: "Milestone / project schedule",
    same_week: "Same week", one_week: "1 week", two_weeks: "2 weeks", month_plus: "1 month or more"
  };

  const text = (raw, name) => String(raw.get(name) || "").trim();
  const nullable = (value) => value || null;
  const numberOrNull = (value) => value === "" ? null : Number(value);

  function dataFromForm() {
    const raw = new FormData(form);
    return {
      legal_name: text(raw, "legal_name"), preferred_name: nullable(text(raw, "preferred_name")),
      email: text(raw, "email").toLowerCase(), phone: text(raw, "phone"), home_base: text(raw, "home_base"),
      business_name: nullable(text(raw, "business_name")), entity_type: text(raw, "entity_type"),
      website: nullable(text(raw, "website")), portfolio_url: nullable(text(raw, "portfolio_url")), social_url: nullable(text(raw, "social_url")),
      worked_with_parti: text(raw, "worked_with_parti") === "yes", parti_capacity: nullable(text(raw, "parti_capacity")),
      primary_role: text(raw, "primary_role"), services: raw.getAll("services").map(String),
      years_experience: text(raw, "years_experience"), experience_summary: text(raw, "experience_summary"),
      notable_work: nullable(text(raw, "notable_work")), markets: raw.getAll("markets").map(String),
      rate_types: raw.getAll("rate_types").map(String),
      rates: {
        hourly_rate: numberOrNull(text(raw, "hourly_rate")), day_rate: numberOrNull(text(raw, "day_rate")),
        day_hours: numberOrNull(text(raw, "day_hours")), minimum_call: nullable(text(raw, "minimum_call")),
        overtime_terms: nullable(text(raw, "overtime_terms")), travel_rate: numberOrNull(text(raw, "travel_rate")),
        payment_terms: text(raw, "payment_terms"), rates_negotiable: text(raw, "rates_negotiable"),
        notes: nullable(text(raw, "rate_notes")), currency: "USD"
      },
      business_independence: {
        other_clients: text(raw, "other_clients"), can_decline: text(raw, "can_decline"),
        can_negotiate: text(raw, "can_negotiate"), advertises: text(raw, "advertises"),
        own_tools: text(raw, "own_tools"), can_hire: text(raw, "can_hire"),
        business_registration: text(raw, "business_registration"), work_location: text(raw, "work_location")
      },
      equipment: nullable(text(raw, "equipment")),
      availability: {
        available_from: text(raw, "available_from"), lead_time: text(raw, "lead_time"),
        nights_weekends: text(raw, "nights_weekends"), travel_availability: text(raw, "travel_availability")
      },
      insurance: {
        general_liability: text(raw, "general_liability"), workers_comp: text(raw, "workers_comp"),
        driving: text(raw, "driving"), w9_ready: text(raw, "w9_ready")
      },
      safety_credentials: raw.getAll("safety_credentials").map(String),
      reference_contact: {
        name: nullable(text(raw, "reference_name")), contact: nullable(text(raw, "reference_contact")),
        context: nullable(text(raw, "reference_context"))
      },
      additional_notes: nullable(text(raw, "additional_notes"))
    };
  }

  function setStatus(message, tone = "") { status.textContent = message; status.dataset.tone = tone; }
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
      else if (!field.validity.valid) {
        if (field.type === "email") message = "Enter a valid email address.";
        else if (field.type === "url") message = "Enter a complete URL, including https://";
        else message = "Check this value.";
      }
      fieldError(field, message); if (message) valid = false;
    });

    step.querySelectorAll("[data-checkbox-group]").forEach((group) => {
      const name = group.dataset.checkboxGroup;
      const checked = group.querySelector(`input[name="${name}"]:checked`);
      const output = step.querySelector(`[data-group-error="${name}"]`);
      if (output) output.textContent = checked ? "" : "Select at least one option.";
      if (!checked) valid = false;
    });

    if (index === 2) {
      const data = dataFromForm();
      const hourly = form.elements.namedItem("hourly_rate");
      const day = form.elements.namedItem("day_rate");
      const notes = form.elements.namedItem("rate_notes");
      if (data.rate_types.includes("hourly") && !data.rates.hourly_rate) { fieldError(hourly, "Enter your hourly rate."); valid = false; }
      if (data.rate_types.includes("day") && !data.rates.day_rate) { fieldError(day, "Enter your day rate."); valid = false; }
      if (data.rate_types.every((type) => ["weekly", "project"].includes(type)) && !data.rates.notes) { fieldError(notes, "Describe your weekly or project pricing."); valid = false; }
    }

    if (index === 0) {
      const workedWithParti = form.elements.namedItem("worked_with_parti");
      const capacity = form.elements.namedItem("parti_capacity");
      if (workedWithParti.value === "yes" && !capacity.value.trim()) { fieldError(capacity, "Tell us how you worked with PARTI."); valid = false; }
    }

    if (index === 4) {
      const data = dataFromForm();
      const referenceName = form.elements.namedItem("reference_name");
      const referenceContact = form.elements.namedItem("reference_contact");
      if (data.reference_contact.name && !data.reference_contact.contact) { fieldError(referenceContact, "Add the reference's email or phone."); valid = false; }
      if (!data.reference_contact.name && data.reference_contact.contact) { fieldError(referenceName, "Add the reference's name."); valid = false; }
    }

    if (!valid) step.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function saveDraft() { try { localStorage.setItem(draftKey, JSON.stringify(dataFromForm())); } catch (_error) {} }
  function restoreDraft() {
    let data; try { data = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch (_error) { return; }
    if (!data) return;
    const flattened = { ...data, ...data.rates, ...data.availability, ...data.business_independence, ...data.insurance,
      reference_name: data.reference_contact?.name, reference_contact: data.reference_contact?.contact,
      reference_context: data.reference_contact?.context, rate_notes: data.rates?.notes,
      worked_with_parti: data.worked_with_parti ? "yes" : "no" };
    ["services", "markets", "rate_types", "safety_credentials"].forEach((name) => {
      const selected = Array.isArray(data[name]) ? data[name] : [];
      form.querySelectorAll(`input[name="${name}"]`).forEach((field) => { field.checked = selected.includes(field.value); });
    });
    Object.entries(flattened).forEach(([name, value]) => {
      if (["services", "markets", "rate_types", "safety_credentials"].includes(name)) return;
      const field = form.elements.namedItem(name); if (field && (typeof value === "string" || typeof value === "number")) field.value = value;
    });
  }

  function escapeHtml(value) { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; }
  function display(value) { return displayValues[value] || String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  function money(value) { return value == null ? null : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }

  function renderReview() {
    const data = dataFromForm();
    const rates = [data.rates.hourly_rate ? `${money(data.rates.hourly_rate)} hourly` : "", data.rates.day_rate ? `${money(data.rates.day_rate)} day rate${data.rates.day_hours ? ` / ${data.rates.day_hours} hours` : ""}` : "", data.rates.travel_rate ? `${money(data.rates.travel_rate)} travel day` : ""].filter(Boolean).join(" · ");
    const entries = [
      ["Name", data.preferred_name ? `${data.legal_name} · ${data.preferred_name}` : data.legal_name], ["Email", data.email],
      ["Phone", data.phone], ["Home base", data.home_base], ["Business", `${data.business_name || "Personal name"} · ${display(data.entity_type)}`],
      ["Prior PARTI work", data.worked_with_parti ? data.parti_capacity : "No"],
      ["Primary role", data.primary_role], ["Experience", display(data.years_experience)], ["Markets", data.markets.join(" · ")],
      ["Services", data.services.join(" · "), true], ["Experience summary", data.experience_summary, true], ["Selected work", data.notable_work, true],
      ["Rate structures", data.rate_types.map(display).join(" · ")], ["Rates", rates || data.rates.notes],
      ["Payment terms", display(data.rates.payment_terms)], ["Available from", data.availability.available_from],
      ["Travel", display(data.availability.travel_availability)], ["General liability", display(data.insurance.general_liability)],
      ["Workers' compensation", display(data.insurance.workers_comp)], ["Safety credentials", data.safety_credentials.join(" · ") || "None listed"],
      ["Equipment", data.equipment, true], ["Additional context", data.additional_notes, true]
    ].filter(([, value]) => value);
    review.innerHTML = entries.map(([label, value, wide]) => `<div class="detail-item ${wide ? "detail-item-wide" : ""}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`).join("");
  }

  function evaluateProfile(data) {
    const flags = [];
    if (data.entity_type === "not_established") flags.push("No established business entity");
    if (["not_currently", "no"].includes(data.business_independence.other_clients)) flags.push("No current outside clientele");
    if (data.business_independence.can_decline !== "yes") flags.push("Limited ability to decline projects");
    if (data.business_independence.can_negotiate === "no") flags.push("Rates or scope not independently negotiated");
    if (data.business_independence.advertises === "no") flags.push("No public business presence");
    if (data.business_independence.own_tools === "no") flags.push("Does not normally provide tools");
    if (data.business_independence.work_location === "parti_location") flags.push("Work primarily at PARTI location");
    if (["in_progress", "none"].includes(data.business_independence.business_registration)) flags.push("Business registration requires review");
    if (["none", "not_applicable"].includes(data.insurance.general_liability)) flags.push("General liability coverage requires review");
    if (data.insurance.workers_comp === "unsure") flags.push("Workers' compensation status unclear");
    if (data.insurance.driving === "yes_personal") flags.push("Vehicle use and insurance require review");
    let score = 55;
    if (data.portfolio_url || data.website) score += 8;
    if (data.notable_work) score += 7;
    if (data.reference_contact.name && data.reference_contact.contact) score += 6;
    if (data.insurance.general_liability === "current") score += 8;
    if (data.business_independence.other_clients.startsWith("yes")) score += 6;
    if (data.business_independence.advertises === "yes") score += 5;
    if (data.safety_credentials.length && !data.safety_credentials.includes("None")) score += 5;
    return { score: Math.min(100, score), flags };
  }

  function attribution() { const params = new URLSearchParams(location.search); return { source: params.get("utm_source"), campaign: params.get("utm_campaign"), referrer: document.referrer || null, landing_url: location.href }; }
  function createReferenceCode() { const now = new Date(); const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`; const bytes = new Uint8Array(3); crypto.getRandomValues(bytes); return `CREW-${date}-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`; }

  function updateProgress() {
    steps.forEach((step, index) => step.classList.toggle("is-active", index === currentStep));
    progressItems.forEach((item, index) => { item.classList.toggle("is-active", index === currentStep); item.classList.toggle("is-complete", index < currentStep); });
    if (currentStep === steps.length - 1) renderReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitProfile(event) {
    event.preventDefault(); if (submitting || !validateStep(currentStep)) return;
    const consents = [form.elements.namedItem("accuracy_consent"), form.elements.namedItem("notice_consent")];
    const consentError = form.querySelector("[data-consent-error]");
    if (consents.some((field) => !field.checked)) { consentError.textContent = "Confirm both acknowledgements before sending."; consents.find((field) => !field.checked)?.focus(); return; }
    consentError.textContent = "";
    if (form.elements.namedItem("office_fax").value) { location.replace("contractor-received.html"); return; }
    if (!client) { setStatus("The secure profile connection is unavailable. Please try again shortly.", "error"); return; }
    const lastSubmit = Number(localStorage.getItem(submittedKey) || 0);
    if (Date.now() - lastSubmit < 60000) { setStatus("A profile was just sent from this device. Wait one minute before trying again.", "error"); return; }

    submitting = true; const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Sending…"; setStatus("Sending your profile securely to PARTI…");
    const data = dataFromForm(); const evaluated = evaluateProfile(data); const referenceCode = createReferenceCode();
    const payload = { ...data, reference_code: referenceCode, completeness_score: evaluated.score, review_flags: evaluated.flags, attribution: attribution() };
    const { error } = await client.from("contractor_profiles").insert(payload);
    if (error) { submitting = false; button.disabled = false; button.textContent = "Send profile to PARTI"; setStatus("We could not send the profile yet. Your draft is still saved on this device. Please try again.", "error"); return; }
    localStorage.removeItem(draftKey); localStorage.setItem(submittedKey, String(Date.now())); sessionStorage.setItem("parti-contractor-reference", referenceCode);
    setStatus("Received. Opening your confirmation…", "success"); location.assign("contractor-received.html");
  }

  form.addEventListener("input", (event) => { fieldError(event.target, ""); saveDraft(); });
  form.addEventListener("change", (event) => {
    if (event.target.name === "safety_credentials" && event.target.checked) {
      form.querySelectorAll('input[name="safety_credentials"]').forEach((field) => {
        if (event.target.value === "None" ? field !== event.target : field.value === "None") field.checked = false;
      });
    }
    saveDraft();
  });
  form.addEventListener("submit", submitProfile);
  form.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => { if (!validateStep(currentStep)) return; currentStep = Math.min(currentStep + 1, steps.length - 1); updateProgress(); saveDraft(); }));
  form.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => { currentStep = Math.max(currentStep - 1, 0); updateProgress(); }));
  const available = form.elements.namedItem("available_from"); if (available) available.min = new Date().toISOString().slice(0, 10);
  restoreDraft(); updateProgress();
})();
