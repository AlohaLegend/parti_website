(function () {
  let client;
  let inquiries = [];
  let selectedId = null;
  const list = document.querySelector("#inquiry-list");
  const detail = document.querySelector("#inquiry-detail");
  const metrics = document.querySelector("#inquiry-metrics");
  const search = document.querySelector("#inquiry-search");
  const filter = document.querySelector("#inquiry-status-filter");

  const statusLabels = { new: "New", reviewing: "Reviewing", discovery_recommended: "Discovery recommended", consultation_ready: "Consultation ready", not_ready: "Not ready", converted: "Converted" };
  const budgetLabels = { under_50: "Under $50,000", "50_100": "$50,000–$100,000", under_100: "Under $100,000", "100_250": "$100,000–$250,000", "250_500": "$250,000–$500,000", "500_1m": "$500,000–$1,000,000", "1m_plus": "$1,000,000+", "500_plus": "$500,000+", tbd: "Not established" };
  const stageLabels = { early_idea: "Early idea / strategy", brief_ready: "Brief ready", creative_started: "Creative started", design_approved: "Design approved", production_ready: "Production ready" };

  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
  function formatDate(value) { if (!value) return "Not set"; return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
  function formatTimestamp(value) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

  async function loadInquiries() {
    window.PARTI_OPERATIONS.showStatus("Refreshing inquiries…");
    const { data, error } = await client.from("inquiries").select("*").order("submitted_at", { ascending: false });
    if (error) { window.PARTI_OPERATIONS.showStatus(`Could not load inquiries: ${error.message}`, "error"); return; }
    inquiries = data || [];
    renderAll();
    window.PARTI_OPERATIONS.showStatus(`${inquiries.length} inquiries loaded.`, "success");
  }

  function filtered() {
    const query = search.value.trim().toLowerCase();
    return inquiries.filter((item) => {
      const matchesStatus = filter.value === "all" || item.status === filter.value;
      const haystack = [item.reference_code, item.contact_name, item.email, item.company, item.project_name, item.project_type, item.location].join(" ").toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }

  function renderMetrics() {
    const active = inquiries.filter((item) => !["not_ready", "converted"].includes(item.status)).length;
    const discovery = inquiries.filter((item) => item.status === "discovery_recommended" || item.recommended_path === "discovery_recommended").length;
    const consult = inquiries.filter((item) => item.status === "consultation_ready" || item.recommended_path === "consultation_ready").length;
    metrics.innerHTML = [["Total inquiries", inquiries.length], ["Open pipeline", active], ["Discovery signals", discovery], ["Consultation ready", consult]].map(([label, value]) => `<article class="metric"><span class="portal-label">${label}</span><strong>${value}</strong></article>`).join("");
  }

  function renderList() {
    const rows = filtered();
    list.innerHTML = rows.length ? rows.map((item) => `<button class="inquiry-row ${item.id === selectedId ? "is-active" : ""}" type="button" data-inquiry-id="${item.id}"><div class="inquiry-row-head"><h3>${escapeHtml(item.project_name)}</h3><span>${escapeHtml(String(item.fit_score ?? "—"))}</span></div><p>${escapeHtml(item.company)} · ${escapeHtml(item.location)}</p><p>${formatTimestamp(item.submitted_at)}</p><span class="status-pill" data-status="${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span></button>`).join("") : '<div class="empty-state"><p>No inquiries match this view.</p></div>';
    list.querySelectorAll("[data-inquiry-id]").forEach((button) => button.addEventListener("click", () => { selectedId = button.dataset.inquiryId; renderAll(); }));
  }

  function item(label, value, wide = false) { if (!value && value !== 0) return ""; return `<div class="detail-item ${wide ? "detail-item-wide" : ""}"><span>${label}</span><p>${escapeHtml(value)}</p></div>`; }

  function renderDetail() {
    const inquiry = inquiries.find((item) => item.id === selectedId);
    if (!inquiry) { detail.innerHTML = '<div class="empty-state"><p>Select an inquiry to review the brief and set the next step.</p></div>'; return; }
    const recommended = statusLabels[inquiry.recommended_path] || String(inquiry.recommended_path || "Manual review").replaceAll("_", " ");
    detail.innerHTML = `
      <div class="detail-header"><div><p class="portal-label">${escapeHtml(inquiry.reference_code)}</p><h2>${escapeHtml(inquiry.project_name)}</h2><p class="detail-copy">${escapeHtml(inquiry.company)} · ${escapeHtml(inquiry.contact_name)} · <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></p></div><span class="status-pill" data-status="${escapeHtml(inquiry.status)}">${escapeHtml(statusLabels[inquiry.status] || inquiry.status)}</span></div>
      <div class="detail-grid">
        ${item("Project type", inquiry.project_type)}${item("Location", inquiry.location)}${item("Target date", formatDate(inquiry.event_date))}${item("Timing", String(inquiry.timing_flexibility || "").replaceAll("_", " "))}
        ${item("Budget", budgetLabels[inquiry.budget_range])}${item("Budget status", String(inquiry.budget_approved || "").replaceAll("_", " "))}${item("Current stage", stageLabels[inquiry.project_stage])}${item("Fit signal", `${inquiry.fit_score ?? "—"} / 100 · ${recommended}`)}
        ${item("Services", (inquiry.services || []).join(" · "), true)}${item("Brief", inquiry.brief, true)}${item("Success looks like", inquiry.success_definition, true)}${item("Decision path", inquiry.decision_process, true)}${inquiry.partnership_interest ? item("Future event partnerships", "Interested in sponsorship, placement, programming, or featured-partner opportunities", true) : ""}${item("Source", `${String(inquiry.source || "").replaceAll("_", " ")}${inquiry.source_detail ? ` — ${inquiry.source_detail}` : ""}`, true)}
      </div>
      <div class="detail-controls">
        <label class="form-field"><span>Pipeline status</span><select id="detail-status">${Object.entries(statusLabels).map(([value,label]) => `<option value="${value}" ${inquiry.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="form-field"><span>Internal notes</span><textarea id="detail-notes" placeholder="Decision, owner, missing information, follow-up…">${escapeHtml(inquiry.internal_notes || "")}</textarea></label>
        <div class="portal-actions"><button class="portal-button portal-button-primary" id="save-inquiry" type="button">Save review</button><a class="portal-button" href="operations-workback.html?inquiry=${encodeURIComponent(inquiry.id)}">Build workback</a><a class="portal-button" href="mailto:${escapeHtml(inquiry.email)}?subject=${encodeURIComponent(`PARTI x ${inquiry.project_name}`)}">Draft email</a></div>
        <p class="form-status" id="detail-status-message" role="status"></p>
      </div>`;
    document.querySelector("#save-inquiry").addEventListener("click", saveSelected);
  }

  async function saveSelected() {
    const statusValue = document.querySelector("#detail-status").value;
    const notes = document.querySelector("#detail-notes").value.trim();
    const output = document.querySelector("#detail-status-message");
    output.textContent = "Saving…";
    const { data, error } = await client.from("inquiries").update({ status: statusValue, internal_notes: notes }).eq("id", selectedId).select("*").single();
    if (error) { output.textContent = error.message; output.dataset.tone = "error"; return; }
    inquiries = inquiries.map((item) => item.id === data.id ? data : item);
    output.textContent = "Review saved."; output.dataset.tone = "success"; renderMetrics(); renderList();
  }

  function renderAll() { renderMetrics(); renderList(); renderDetail(); }

  function exportCsv() {
    const headers = ["reference_code","submitted_at","status","fit_score","recommended_path","company","contact_name","email","phone","website","project_name","project_type","location","event_date","timing_flexibility","budget_range","budget_approved","project_stage","services","brief","success_definition","decision_process","partnership_interest","source","source_detail","internal_notes"];
    const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
    const csv = [headers.join(","), ...filtered().map((row) => headers.map((key) => quote(Array.isArray(row[key]) ? row[key].join(" | ") : row[key])).join(","))].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `parti-inquiries-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  search.addEventListener("input", renderList); filter.addEventListener("change", renderList);
  document.querySelector("#refresh-inquiries").addEventListener("click", loadInquiries);
  document.querySelector("#export-inquiries").addEventListener("click", exportCsv);
  window.addEventListener("parti:operations-ready", (event) => { client = event.detail.client; loadInquiries(); });
})();
