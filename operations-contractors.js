(function () {
  const list = document.querySelector("#contractor-list");
  if (!list) return;
  const detail = document.querySelector("#contractor-detail");
  const metrics = document.querySelector("#contractor-metrics");
  const search = document.querySelector("#contractor-search");
  const filter = document.querySelector("#contractor-status-filter");
  let client = window.PARTI_SUPABASE?.client;
  let profiles = [];
  let selectedId = null;

  const statusLabels = { new: "New", reviewing: "Reviewing", needs_info: "Needs information", eligible_pool: "Eligible pool", hold: "Hold", engaged: "Engaged", declined: "Declined" };
  const classificationLabels = { unreviewed: "Unreviewed", contractor_candidate: "Contractor candidate", employee_review: "Employee path review", counsel_review: "Counsel review" };
  const escapeHtml = (value) => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };
  const format = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const money = (value) => value == null || value === "" ? null : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const timestamp = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
  const dateOnly = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Not set";
  const item = (label, value, wide = false) => value === null || value === undefined || value === "" ? "" : `<div class="detail-item ${wide ? "detail-item-wide" : ""}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`;

  async function loadProfiles() {
    if (!client) return;
    list.innerHTML = '<div class="empty-state"><p>Loading talent profiles…</p></div>';
    const { data, error } = await client.from("contractor_profiles").select("*").order("submitted_at", { ascending: false });
    if (error) { list.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`; return; }
    profiles = data || []; if (!selectedId && profiles.length) selectedId = profiles[0].id; renderAll();
  }

  function filtered() {
    const query = search.value.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesStatus = filter.value === "all" || profile.status === filter.value;
      const haystack = [profile.reference_code, profile.legal_name, profile.preferred_name, profile.business_name, profile.primary_role, profile.home_base, ...(profile.services || []), ...(profile.markets || [])].join(" ").toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }

  function renderMetrics() {
    const review = profiles.filter((profile) => ["new", "reviewing", "needs_info"].includes(profile.status)).length;
    const eligible = profiles.filter((profile) => profile.status === "eligible_pool").length;
    const flagged = profiles.filter((profile) => (profile.review_flags || []).length > 0 || ["employee_review", "counsel_review"].includes(profile.classification_status)).length;
    metrics.innerHTML = [["Total profiles", profiles.length], ["Needs review", review], ["Eligible pool", eligible], ["Classification flags", flagged]].map(([label, value]) => `<article class="metric"><span class="portal-label">${label}</span><strong>${value}</strong></article>`).join("");
  }

  function renderList() {
    const rows = filtered();
    list.innerHTML = rows.length ? rows.map((profile) => `<button class="inquiry-row ${profile.id === selectedId ? "is-active" : ""}" type="button" data-contractor-id="${escapeHtml(profile.id)}"><div class="inquiry-row-head"><h3>${escapeHtml(profile.preferred_name || profile.legal_name)}</h3><span>${escapeHtml(String(profile.completeness_score ?? "Not scored"))}</span></div><p>${escapeHtml(profile.primary_role)} · ${escapeHtml(profile.home_base)}</p><p>${timestamp(profile.submitted_at)}</p><span class="status-pill" data-status="${escapeHtml(profile.status)}">${escapeHtml(statusLabels[profile.status] || profile.status)}</span></button>`).join("") : '<div class="empty-state"><p>No profiles match this view.</p></div>';
    list.querySelectorAll("[data-contractor-id]").forEach((button) => button.addEventListener("click", () => { selectedId = button.dataset.contractorId; renderAll(); }));
  }

  function renderDetail() {
    const profile = profiles.find((entry) => entry.id === selectedId);
    if (!profile) { detail.innerHTML = '<div class="empty-state"><p>Select a talent profile to review rates, readiness, and classification signals.</p></div>'; return; }
    const rates = profile.rates || {}; const independence = profile.business_independence || {}; const availability = profile.availability || {}; const insurance = profile.insurance || {}; const reference = profile.reference_contact || {};
    const rateSummary = [rates.hourly_rate ? `${money(rates.hourly_rate)} hourly` : "", rates.day_rate ? `${money(rates.day_rate)} / day${rates.day_hours ? ` (${rates.day_hours} hours)` : ""}` : "", rates.travel_rate ? `${money(rates.travel_rate)} travel day` : "", rates.minimum_call ? `Minimum ${rates.minimum_call}` : ""].filter(Boolean).join(" · ");
    const flags = (profile.review_flags || []).length ? `<div class="review-flag-panel"><p class="portal-label">Review flags · not a legal determination</p><ul>${profile.review_flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul></div>` : '<div class="review-flag-panel is-clear"><p>No automated review flags. Classification still requires human review of the actual project relationship.</p></div>';
    detail.innerHTML = `<div class="detail-header"><div><p class="portal-label">${escapeHtml(profile.reference_code)}</p><h2>${escapeHtml(profile.preferred_name || profile.legal_name)}</h2><p class="detail-copy">${escapeHtml(profile.primary_role)} · <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a> · ${escapeHtml(profile.phone)}</p></div><span class="status-pill" data-status="${escapeHtml(profile.status)}">${escapeHtml(statusLabels[profile.status] || profile.status)}</span></div>
      ${flags}<div class="detail-grid">
      ${item("Legal name", profile.legal_name)}${item("Business", `${profile.business_name || "Personal name"} · ${format(profile.entity_type)}`)}${item("Home base", profile.home_base)}${item("Experience", format(profile.years_experience))}
      ${item("Website", profile.website)}${item("Portfolio", profile.portfolio_url)}${item("Markets", (profile.markets || []).join(" · "), true)}${item("Services", (profile.services || []).join(" · "), true)}
      ${item("Experience summary", profile.experience_summary, true)}${item("Selected work", profile.notable_work, true)}${item("Rate structures", (profile.rate_types || []).map(format).join(" · "))}${item("Rates", rateSummary || rates.notes)}
      ${item("Payment terms", format(rates.payment_terms))}${item("Rates negotiable", format(rates.rates_negotiable))}${item("Rate notes", rates.notes, true)}
      ${item("Other clients", format(independence.other_clients))}${item("Can decline projects", format(independence.can_decline))}${item("Can negotiate", format(independence.can_negotiate))}${item("Public business presence", format(independence.advertises))}
      ${item("Own tools", format(independence.own_tools))}${item("Can hire assistants", format(independence.can_hire))}${item("Business registration", format(independence.business_registration))}${item("Work location", format(independence.work_location))}${item("Equipment", profile.equipment, true)}
      ${item("Available from", dateOnly(availability.available_from))}${item("Lead time", format(availability.lead_time))}${item("Nights / weekends", format(availability.nights_weekends))}${item("Travel", format(availability.travel_availability))}
      ${item("General liability", format(insurance.general_liability))}${item("Workers' compensation", format(insurance.workers_comp))}${item("Driving", format(insurance.driving))}${item("Tax form readiness", format(insurance.w9_ready))}
      ${item("Safety credentials", (profile.safety_credentials || []).join(" · ") || "None listed", true)}${item("Reference", [reference.name, reference.contact, reference.context].filter(Boolean).join(" · "), true)}${item("Additional context", profile.additional_notes, true)}
      </div><div class="detail-controls"><label class="form-field"><span>Network status</span><select id="contractor-detail-status">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${profile.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="form-field"><span>Classification review</span><select id="contractor-classification">${Object.entries(classificationLabels).map(([value, label]) => `<option value="${value}" ${profile.classification_status === value ? "selected" : ""}>${label}</option>`).join("")}</select><small class="field-help">Use this as a routing decision only. Counsel or payroll should review uncertain scopes.</small></label><label class="form-field"><span>Internal notes</span><textarea id="contractor-notes" placeholder="Strengths, project fit, missing documents, reviewer, next step…">${escapeHtml(profile.internal_notes || "")}</textarea></label><div class="portal-actions"><button class="portal-button portal-button-primary" id="save-contractor" type="button">Save review</button><a class="portal-button" href="mailto:${escapeHtml(profile.email)}?subject=${encodeURIComponent("PARTI talent network follow-up")}">Draft email</a></div><p class="form-status" id="contractor-save-message" role="status"></p></div>`;
    document.querySelector("#save-contractor").addEventListener("click", saveSelected);
  }

  async function saveSelected() {
    const output = document.querySelector("#contractor-save-message"); output.textContent = "Saving…";
    const updates = { status: document.querySelector("#contractor-detail-status").value, classification_status: document.querySelector("#contractor-classification").value, internal_notes: document.querySelector("#contractor-notes").value.trim() };
    const { data, error } = await client.from("contractor_profiles").update(updates).eq("id", selectedId).select("*").single();
    if (error) { output.textContent = error.message; output.dataset.tone = "error"; return; }
    profiles = profiles.map((profile) => profile.id === data.id ? data : profile); output.textContent = "Review saved."; output.dataset.tone = "success"; renderMetrics(); renderList();
  }

  function exportCsv() {
    const headers = ["reference_code","submitted_at","status","classification_status","completeness_score","review_flags","legal_name","preferred_name","email","phone","home_base","business_name","entity_type","primary_role","services","years_experience","markets","rate_types","rates","availability","business_independence","insurance","safety_credentials","equipment","reference_contact","additional_notes","internal_notes"];
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...filtered().map((row) => headers.map((key) => quote(Array.isArray(row[key]) ? row[key].join(" | ") : typeof row[key] === "object" && row[key] ? JSON.stringify(row[key]) : row[key])).join(","))].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `parti-talent-network-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  function renderAll() { renderMetrics(); renderList(); renderDetail(); }
  search.addEventListener("input", renderList); filter.addEventListener("change", renderList); document.querySelector("#refresh-contractors").addEventListener("click", loadProfiles); document.querySelector("#export-contractors").addEventListener("click", exportCsv);
  window.addEventListener("parti:operations-ready", (event) => { client = event.detail.client; loadProfiles(); });
})();
