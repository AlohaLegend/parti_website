(function () {
  const list = document.querySelector("#employee-list");
  if (!list) return;
  const detail = document.querySelector("#employee-detail");
  const metrics = document.querySelector("#employee-metrics");
  const search = document.querySelector("#employee-search");
  const filter = document.querySelector("#employee-status-filter");
  const linkBuilder = document.querySelector("#employee-link-builder");
  const generatedLink = document.querySelector("#employee-generated-link");
  const copyLink = document.querySelector("#copy-employee-link");
  const previewLink = document.querySelector("#preview-employee-link");
  const linkStatus = document.querySelector("#link-builder-status");
  let client = window.PARTI_SUPABASE?.client;
  let candidates = [];
  let selectedId = null;
  let currentGeneratedLink = "";

  const statusLabels = { new: "New", reviewing: "Reviewing", needs_info: "Needs information", terms_review: "Terms review", offer_ready: "Offer ready", hold: "Hold", closed: "Closed" };
  const decisionLabels = { unreviewed: "Unreviewed", approved_now: "Approved now", review_later: "Review later", not_approved: "Not approved" };
  const escapeHtml = (value) => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };
  const format = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const timestamp = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
  const dateOnly = (value) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Not set";
  const item = (label, value, wide = false) => value === null || value === undefined || value === "" ? "" : `<div class="detail-item ${wide ? "detail-item-wide" : ""}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`;
  const joined = (value) => Array.isArray(value) ? value.join(" · ") : value;

  async function loadCandidates() {
    if (!client) return;
    list.innerHTML = '<div class="empty-state"><p>Loading candidate intakes...</p></div>';
    const { data, error } = await client.from("employee_intakes").select("*").order("submitted_at", { ascending: false });
    if (error) { list.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`; return; }
    candidates = data || []; if (!selectedId && candidates.length) selectedId = candidates[0].id; renderAll();
  }

  function filtered() {
    const query = search.value.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const matchesStatus = filter.value === "all" || candidate.status === filter.value;
      const haystack = [candidate.reference_code, candidate.legal_name, candidate.preferred_name, candidate.email, candidate.location, candidate.role_title, candidate.employment_type].join(" ").toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }

  function renderMetrics() {
    const open = candidates.filter((candidate) => ["new", "reviewing", "needs_info"].includes(candidate.status)).length;
    const terms = candidates.filter((candidate) => candidate.status === "terms_review").length;
    const approved = candidates.filter((candidate) => candidate.review_decision === "approved_now").length;
    metrics.innerHTML = [["Total candidates", candidates.length], ["Needs review", open], ["Terms review", terms], ["Approved now", approved]].map(([label, value]) => `<article class="metric"><span class="portal-label">${label}</span><strong>${value}</strong></article>`).join("");
  }

  function renderList() {
    const rows = filtered();
    list.innerHTML = rows.length ? rows.map((candidate) => `<button class="inquiry-row ${candidate.id === selectedId ? "is-active" : ""}" type="button" data-employee-id="${escapeHtml(candidate.id)}"><div class="inquiry-row-head"><h3>${escapeHtml(candidate.preferred_name || candidate.legal_name)}</h3><span class="status-pill" data-status="${escapeHtml(candidate.review_decision)}">${escapeHtml(decisionLabels[candidate.review_decision] || candidate.review_decision)}</span></div><p>${escapeHtml(candidate.role_title)} · ${escapeHtml(format(candidate.employment_type))}</p><p>${escapeHtml(candidate.location)} · ${timestamp(candidate.submitted_at)}</p><span class="status-pill" data-status="${escapeHtml(candidate.status)}">${escapeHtml(statusLabels[candidate.status] || candidate.status)}</span></button>`).join("") : '<div class="empty-state"><p>No candidate intakes match this view.</p></div>';
    list.querySelectorAll("[data-employee-id]").forEach((button) => button.addEventListener("click", () => { selectedId = button.dataset.employeeId; renderAll(); }));
  }

  function renderDetail() {
    const candidate = candidates.find((entry) => entry.id === selectedId);
    if (!candidate) { detail.innerHTML = '<div class="empty-state"><p>Select a candidate intake to review role fit, requests, and next steps.</p></div>'; return; }
    const role = candidate.role_snapshot || {}; const contribution = candidate.contribution || {}; const compensation = candidate.compensation || {}; const working = candidate.working_conditions || {}; const decision = candidate.decision_factors || {};
    const missing = role.missing_fields || [];
    const roleNotice = missing.length ? `<div class="review-flag-panel"><p class="portal-label">Role briefing incomplete</p><ul>${missing.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></div>` : '<div class="review-flag-panel is-clear"><p>The shared link included every role briefing field requested by Adam.</p></div>';
    detail.innerHTML = `<div class="detail-header"><div><p class="portal-label">${escapeHtml(candidate.reference_code)}</p><h2>${escapeHtml(candidate.preferred_name || candidate.legal_name)}</h2><p class="detail-copy">${escapeHtml(candidate.role_title)} · <a href="mailto:${escapeHtml(candidate.email)}">${escapeHtml(candidate.email)}</a> · ${escapeHtml(candidate.phone)}</p></div><span class="status-pill" data-status="${escapeHtml(candidate.status)}">${escapeHtml(statusLabels[candidate.status] || candidate.status)}</span></div>
      ${roleNotice}<h3 class="detail-section-title">Role briefing shown to candidate</h3><div class="detail-grid">
      ${item("Role", role.title || candidate.role_title)}${item("Reports to", role.reports_to)}${item("Work location", role.location)}${item("Expected schedule", role.schedule)}${item("Approved compensation range", role.pay_range)}${item("Benefits currently available", role.benefits)}${item("Essential responsibilities", role.responsibilities, true)}${item("Candidate questions or corrections", candidate.role_questions, true)}</div>
      <h3 class="detail-section-title">Contact + opportunity</h3><div class="detail-grid">${item("Legal name", candidate.legal_name)}${item("Location", candidate.location)}${item("Profile link", candidate.profile_url)}${item("Opportunity type", format(candidate.employment_type))}${item("Worked with PARTI", candidate.worked_with_parti ? `Yes${candidate.parti_capacity ? ` · ${candidate.parti_capacity}` : ""}` : "No")}${item("Realistic start date", dateOnly(candidate.start_date))}</div>
      <h3 class="detail-section-title">Contribution + growth</h3><div class="detail-grid">${item("Day-one ownership", contribution.day_one_ownership, true)}${item("Support needed", contribution.support_needed, true)}${item("Growth areas", contribution.growth_areas)}${item("90-day success", contribution.success_90_days)}${item("Representative work", contribution.representative_work, true)}${item("Preferred environments", joined(contribution.work_environments), true)}${item("Feedback preferences", contribution.feedback_preferences)}${item("2 to 3 year responsibility", contribution.future_responsibility)}</div>
      <h3 class="detail-section-title">Compensation + priorities</h3><div class="detail-grid">${item("Compensation preference", `${format(compensation.type)}${compensation.desired ? ` · ${compensation.desired}` : ""}`)}${item("Top priorities", joined(compensation.priorities), true)}${item("Essential now", compensation.essential_now, true)}${item("Negotiable", compensation.negotiable_now)}${item("Review later", compensation.review_later)}${item("Preferred or disliked structures", compensation.structure_preferences, true)}${item("Meaningful incentive targets", joined(compensation.incentive_targets), true)}${item("Long-term incentive goals", compensation.long_term_goals, true)}</div>
      <h3 class="detail-section-title">Working conditions + decision</h3><div class="detail-grid">${item("Work arrangement", format(working.arrangement))}${item("Travel comfort", format(working.travel_comfort))}${item("Nights and weekends", format(working.nights_weekends))}${item("Schedule constraints", working.schedule_constraints)}${item("Equipment needed", working.equipment_needed)}${item("Current commitments", working.current_commitments)}${item("Agreement affecting role", format(working.restrictive_agreement))}${item("Agreement summary", working.agreement_summary)}${item("Would say yes", decision.say_yes, true)}${item("Would decline", decision.decline_reasons, true)}${item("Questions before accepting", decision.acceptance_questions, true)}${item("Alternatives", joined(decision.alternatives), true)}${item("Decision deadline", dateOnly(decision.decision_deadline))}${item("Sensitive item for live discussion", format(decision.sensitive_live))}${item("Additional context", decision.additional_context, true)}</div>
      <div class="detail-controls"><h3 class="detail-section-title">PARTI internal review</h3><p class="detail-copy">Review candidate requests individually. Only an approved formal offer workflow should create proposed terms.</p>
      <div class="form-grid"><label class="form-field"><span>Candidate status</span><select id="employee-detail-status">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${candidate.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="form-field"><span>Request decision</span><select id="employee-review-decision">${Object.entries(decisionLabels).map(([value, label]) => `<option value="${value}" ${candidate.review_decision === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="form-field"><span>Owner</span><input id="employee-review-owner" maxlength="180" value="${escapeHtml(candidate.review_owner || "")}"></label><label class="form-field"><span>Review date</span><input id="employee-review-date" type="date" value="${escapeHtml(candidate.review_date || "")}"></label><label class="form-field form-field-wide"><span>Prerequisite or future-review condition</span><textarea id="employee-review-prerequisite" maxlength="2500">${escapeHtml(candidate.review_prerequisite || "")}</textarea></label><label class="form-field form-field-wide"><span>Explanation or approved alternative</span><textarea id="employee-review-explanation" maxlength="2500">${escapeHtml(candidate.review_explanation || "")}</textarea></label><label class="form-field form-field-wide"><span>Internal notes</span><textarea id="employee-notes" maxlength="5000">${escapeHtml(candidate.internal_notes || "")}</textarea></label></div>
      <div class="portal-actions"><button class="portal-button portal-button-primary" id="save-employee" type="button">Save review</button><a class="portal-button" href="mailto:${escapeHtml(candidate.email)}?subject=${encodeURIComponent("PARTI role follow-up")}">Draft email</a></div><p class="form-status" id="employee-save-message" role="status"></p></div>`;
    document.querySelector("#save-employee").addEventListener("click", saveSelected);
  }

  async function saveSelected() {
    const output = document.querySelector("#employee-save-message");
    const reviewDecision = document.querySelector("#employee-review-decision").value;
    const owner = document.querySelector("#employee-review-owner").value.trim();
    const date = document.querySelector("#employee-review-date").value || null;
    const prerequisite = document.querySelector("#employee-review-prerequisite").value.trim();
    const explanation = document.querySelector("#employee-review-explanation").value.trim();
    if (reviewDecision === "review_later" && (!owner || !date || !prerequisite)) { output.textContent = "Review later requires an owner, review date, and prerequisite."; output.dataset.tone = "error"; return; }
    if (reviewDecision === "not_approved" && !explanation) { output.textContent = "Not approved requires an explanation or approved alternative."; output.dataset.tone = "error"; return; }
    if (reviewDecision === "approved_now" && !owner) { output.textContent = "Approved now requires an accountable owner."; output.dataset.tone = "error"; return; }
    const statusValue = document.querySelector("#employee-detail-status").value;
    if (statusValue === "offer_ready" && reviewDecision !== "approved_now") { output.textContent = "Offer ready requires the request decision to be Approved now."; output.dataset.tone = "error"; return; }
    output.textContent = "Saving...";
    const updates = { status: statusValue, review_decision: reviewDecision, review_owner: owner, review_date: date, review_prerequisite: prerequisite, review_explanation: explanation, internal_notes: document.querySelector("#employee-notes").value.trim() };
    const { data, error } = await client.from("employee_intakes").update(updates).eq("id", selectedId).select("*").single();
    if (error) { output.textContent = error.message; output.dataset.tone = "error"; return; }
    candidates = candidates.map((candidate) => candidate.id === data.id ? data : candidate); output.textContent = "Review saved."; output.dataset.tone = "success"; renderMetrics(); renderList();
  }

  function updateGeneratedLink() {
    const raw = new FormData(linkBuilder);
    const values = Object.fromEntries([...raw.entries()].map(([key, value]) => [key, String(value).trim()]));
    const complete = [...linkBuilder.querySelectorAll("[required]")].every((field) => field.value.trim());
    if (!complete) { currentGeneratedLink = ""; generatedLink.textContent = "Complete every approved role detail to generate the link."; copyLink.disabled = true; previewLink.href = "employee-intake.html"; return; }
    const url = new URL("employee-intake.html", location.href);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    currentGeneratedLink = url.href; generatedLink.textContent = currentGeneratedLink; copyLink.disabled = false; previewLink.href = currentGeneratedLink;
  }

  async function copyGeneratedLink() {
    if (!currentGeneratedLink) return;
    try { await navigator.clipboard.writeText(currentGeneratedLink); linkStatus.textContent = "Candidate link copied."; linkStatus.dataset.tone = "success"; }
    catch (_error) { linkStatus.textContent = "Copy was blocked. Select the link above and copy it manually."; linkStatus.dataset.tone = "error"; }
  }

  function exportCsv() {
    const headers = ["reference_code","submitted_at","status","review_decision","review_owner","review_date","review_prerequisite","review_explanation","legal_name","preferred_name","email","phone","location","profile_url","role_title","employment_type","worked_with_parti","parti_capacity","start_date","role_questions","role_snapshot","contribution","compensation","working_conditions","decision_factors","internal_notes"];
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...filtered().map((row) => headers.map((key) => quote(typeof row[key] === "object" && row[key] ? JSON.stringify(row[key]) : row[key])).join(","))].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `parti-employee-candidates-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  function renderAll() { renderMetrics(); renderList(); renderDetail(); }
  linkBuilder.addEventListener("input", updateGeneratedLink); copyLink.addEventListener("click", copyGeneratedLink); updateGeneratedLink();
  search.addEventListener("input", renderList); filter.addEventListener("change", renderList); document.querySelector("#refresh-employees").addEventListener("click", loadCandidates); document.querySelector("#export-employees").addEventListener("click", exportCsv);
  window.addEventListener("parti:operations-ready", (event) => { client = event.detail.client; loadCandidates(); });
})();
