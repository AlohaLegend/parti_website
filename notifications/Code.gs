const NOTIFICATION_EMAIL = "liam@letsparti.co";
const INQUIRY_DESK_URL = "https://letsparti.co/operations-inquiries.html";

const BUDGET_LABELS = {
  under_100: "Under $100,000",
  "100_250": "$100,000–$250,000",
  "250_500": "$250,000–$500,000",
  "500_1m": "$500,000–$1,000,000",
  "1m_plus": "$1,000,000+",
  tbd: "Not established yet"
};

function doPost(event) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
  const suppliedSecret = event && event.parameter ? event.parameter.key : "";

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse_({ ok: false, error: "Unauthorized" });
  }

  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "inquiries" || !payload.record) {
      return jsonResponse_({ ok: false, error: "Unsupported event" });
    }

    sendInquiryNotification_(payload.record);
    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function sendInquiryNotification_(inquiry) {
  const reference = safeText_(inquiry.reference_code || "New inquiry");
  const company = safeText_(inquiry.company || "Company not provided");
  const project = safeText_(inquiry.project_name || "Untitled project");
  const partnership = inquiry.partnership_interest
    ? '<div style="margin:20px 0;padding:16px;border:1px solid #a95cf3;background:#f6edff"><strong>Future event partnership interest</strong><br><span>Interested in sponsorship, product placement, collaborative programming, or featured-partner opportunities.</span></div>'
    : "";

  const rows = [
    ["Reference", reference],
    ["Company", company],
    ["Contact", inquiry.contact_name],
    ["Email", inquiry.email],
    ["Phone", inquiry.phone],
    ["Project", project],
    ["Project type", inquiry.project_type],
    ["Location", inquiry.location],
    ["Target date", inquiry.event_date || "Not set"],
    ["Budget", BUDGET_LABELS[inquiry.budget_range] || inquiry.budget_range],
    ["Budget status", titleCase_(inquiry.budget_approved)],
    ["Current stage", titleCase_(inquiry.project_stage)],
    ["Fit signal", `${inquiry.fit_score || 0} / 100 · ${titleCase_(inquiry.recommended_path)}`],
    ["Services", Array.isArray(inquiry.services) ? inquiry.services.join(" · ") : inquiry.services],
    ["Source", `${titleCase_(inquiry.source)}${inquiry.source_detail ? ` — ${inquiry.source_detail}` : ""}`],
    ["Brief", inquiry.brief],
    ["Success looks like", inquiry.success_definition],
    ["Decision path", inquiry.decision_process]
  ].filter(function (row) { return row[1] !== null && row[1] !== undefined && row[1] !== ""; });

  const rowHtml = rows.map(function (row) {
    return `<tr><td style="width:150px;padding:10px 12px;border-top:1px solid #dddddd;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:.06em;vertical-align:top">${escapeHtml_(row[0])}</td><td style="padding:10px 12px;border-top:1px solid #dddddd;vertical-align:top;white-space:pre-wrap">${escapeHtml_(row[1])}</td></tr>`;
  }).join("");

  const htmlBody = `
    <div style="max-width:720px;margin:0 auto;background:#ffffff;color:#111111;font-family:Arial,sans-serif;line-height:1.5">
      <div style="padding:26px;background:#111111;color:#ffffff;border-top:6px solid #a95cf3">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#d7b5fa">PARTI website</div>
        <h1 style="margin:8px 0 0;font-size:26px">New project inquiry received</h1>
        <p style="margin:8px 0 0;color:#dddddd">${project} · ${company}</p>
      </div>
      <div style="padding:24px">
        ${partnership}
        <table role="presentation" style="width:100%;border-collapse:collapse">${rowHtml}</table>
        <p style="margin:24px 0 0"><a href="${INQUIRY_DESK_URL}" style="display:inline-block;padding:12px 18px;background:#a95cf3;color:#111111;text-decoration:none;font-weight:bold">Open Inquiry Desk</a></p>
      </div>
    </div>`;

  const body = rows.map(function (row) { return `${row[0]}: ${row[1]}`; }).join("\n\n") + `\n\nInquiry Desk: ${INQUIRY_DESK_URL}`;

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `New PARTI inquiry · ${company} · ${project} · ${reference}`,
    body: body,
    htmlBody: htmlBody,
    name: "PARTI Website"
  });
}

function titleCase_(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function safeText_(value) {
  return String(value || "").trim();
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
