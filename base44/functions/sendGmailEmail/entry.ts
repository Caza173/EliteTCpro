import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Standard Email Template ───────────────────────────────────────────────────
function buildEmailHTML({
  recipientName,
  openingLine,
  propertyAddress,
  buyerName,
  sellerName,
  transactionStatus,
  actionItems = [],
  criticalDates = [],
  links = [],
  nextSteps,
  senderName = "Corey Caza",
  senderRole = "EliteTC Operations, Caza Team",
  companyName = "",
  phoneNumber = "(603) 520-5431",
  customBody,
}) {
  // If a plain custom body is passed with no template data, wrap it nicely
  if (customBody && !propertyAddress) {
    return `
<div style="font-family:Arial,Inter,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;font-size:14px;">
  ${recipientName ? `<p style="margin:0 0 16px;">Hi ${recipientName},</p>` : ""}
  <div style="margin:0 0 24px;">${customBody.replace(/\n/g, "<br/>")}</div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
  <p style="margin:0;color:#475569;font-size:13px;">
    ${senderName}<br/>
    ${senderRole}<br/>
    ${companyName}<br/>
    ${phoneNumber}
  </p>
</div>`;
  }

  const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>`;

  const txSummary = propertyAddress ? `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Transaction Summary</p>
    <ul style="margin:0 0 0 0;padding:0;list-style:none;">
      ${propertyAddress ? `<li style="margin-bottom:4px;">📍 <strong>Property:</strong> ${propertyAddress}</li>` : ""}
      ${buyerName ? `<li style="margin-bottom:4px;">👤 <strong>Buyer:</strong> ${buyerName}</li>` : ""}
      ${sellerName ? `<li style="margin-bottom:4px;">👤 <strong>Seller:</strong> ${sellerName}</li>` : ""}
      ${transactionStatus ? `<li style="margin-bottom:4px;">📋 <strong>Status:</strong> ${transactionStatus}</li>` : ""}
    </ul>` : "";

  const actionSection = actionItems.length ? `
    ${divider}
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Key Details / Action Items</p>
    <ul style="margin:0;padding:0 0 0 16px;color:#1e293b;">
      ${actionItems.map(i => `<li style="margin-bottom:4px;">${i}</li>`).join("")}
    </ul>` : "";

  const datesSection = criticalDates.length ? `
    ${divider}
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Important Dates</p>
    <ul style="margin:0;padding:0 0 0 16px;color:#1e293b;">
      ${criticalDates.map(d => `<li style="margin-bottom:4px;"><strong>${d.label}:</strong> ${d.date}</li>`).join("")}
    </ul>` : "";

  const linksSection = links.length ? `
    ${divider}
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Documents / Links</p>
    <ul style="margin:0;padding:0 0 0 16px;">
      ${links.map(l => `<li style="margin-bottom:4px;"><a href="${l.url}" style="color:#2563eb;">${l.label}</a></li>`).join("")}
    </ul>` : "";

  const nextStepsSection = nextSteps ? `
    ${divider}
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Next Steps</p>
    <p style="margin:0;color:#1e293b;">${nextSteps}</p>` : "";

  return `
<div style="font-family:Arial,Inter,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.5;font-size:14px;">
  ${recipientName ? `<p style="margin:0 0 16px;">Hi ${recipientName},</p>` : ""}
  ${openingLine ? `<p style="margin:0 0 16px;">${openingLine}</p>` : ""}
  ${txSummary ? `${divider}${txSummary}` : ""}
  ${actionSection}
  ${datesSection}
  ${linksSection}
  ${nextStepsSection}
  ${divider}
  <p style="margin:0 0 20px;color:#64748b;font-size:13px;">If anything looks off or you need changes, reply directly to this email.</p>
  <p style="margin:0;color:#475569;font-size:13px;line-height:1.8;">
    <strong>${senderName}</strong><br/>
    ${senderRole}<br/>
    ${companyName}<br/>
    ${phoneNumber}
  </p>
</div>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = ["admin", "owner", "tc_lead", "tc"];
    if (!allowed.includes(user.role) && user.email !== "nhcazateam@gmail.com") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      to,
      subject,
      body: emailBody,         // plain text / html fallback
      htmlBody,                // pre-built HTML (from commission modal etc.)
      // Template fields
      recipientName,
      openingLine,
      propertyAddress,
      buyerName,
      sellerName,
      transactionStatus,
      actionItems,
      criticalDates,
      links,
      nextSteps,
      senderName,
      senderRole,
      companyName,
      phoneNumber,
      // Logging
      transaction_id,
      brokerage_id,
      fromName,
    } = body;

    // Use user's saved signature fields as fallback defaults
    const sigName    = senderName   || user.data?.sig_name    || "Corey Caza";
    const sigRole    = senderRole   || user.data?.sig_role    || "EliteTC Operations";
    const sigCompany = companyName  || user.data?.sig_company || "Realty One Group Next Level";
    const sigPhone   = phoneNumber  || user.data?.sig_phone   || "(603) 520-5431";

    if (!to) return Response.json({ error: "Recipient required" }, { status: 400 });
    if (!subject) return Response.json({ error: "Subject required" }, { status: 400 });

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (!recipients.length) return Response.json({ error: "No valid recipients" }, { status: 400 });

    // Build final HTML — use pre-built htmlBody if provided, otherwise render template
    const finalHtml = htmlBody || buildEmailHTML({
      recipientName,
      openingLine,
      propertyAddress,
      buyerName,
      sellerName,
      transactionStatus,
      actionItems,
      criticalDates,
      links,
      nextSteps,
      senderName: sigName,
      senderRole: sigRole,
      companyName: sigCompany,
      phoneNumber: sigPhone,
      customBody: emailBody,
    });

    if (!finalHtml) return Response.json({ error: "Body required" }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    // Fetch and base64-encode attachments if any
    const attachmentDocIds = body.attachment_document_ids || [];
    const attachments = [];
    if (attachmentDocIds.length > 0) {
      const docs = await base44.asServiceRole.entities.Document.filter({ transaction_id: transaction_id || "" });
      for (const doc of docs) {
        if (!attachmentDocIds.includes(doc.id) || !doc.file_url) continue;
        try {
          const fileRes = await fetch(doc.file_url);
          if (!fileRes.ok) continue;
          const arrayBuf = await fileRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);
          // Convert to base64
          let binary = "";
          for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          const b64 = btoa(binary);
          const fileName = doc.file_name || `document_${doc.id}.pdf`;
          const mimeType = fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
          attachments.push({ b64, fileName, mimeType });
        } catch (e) {
          console.warn(`Failed to fetch attachment ${doc.id}:`, e.message);
        }
      }
    }

    const boundary = `----=_Part_${Date.now()}`;

    const buildMimeMessage = (recipient) => {
      const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      const fromLabel = fromName || sigName || "EliteTC";

      if (attachments.length === 0) {
        // Simple HTML-only message (no attachments)
        return [
          `From: ${fromLabel} <me>`,
          `To: ${recipient}`,
          `Subject: ${encodedSubject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          finalHtml,
        ].join("\r\n");
      }

      // Multipart/mixed with HTML body + attachments
      const parts = [];

      // Headers
      parts.push(
        `From: ${fromLabel} <me>`,
        `To: ${recipient}`,
        `Subject: ${encodedSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: quoted-printable`,
        ``,
        finalHtml,
      );

      // Attachment parts
      for (const att of attachments) {
        const safeName = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(att.fileName)))}?=`;
        parts.push(
          ``,
          `--${boundary}`,
          `Content-Type: ${att.mimeType}; name="${safeName}"`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          ``,
          // Split base64 into 76-char lines (RFC 2045)
          att.b64.match(/.{1,76}/g).join("\r\n"),
        );
      }

      parts.push(``, `--${boundary}--`);
      return parts.join("\r\n");
    };

    const results = await Promise.allSettled(recipients.map(async (recipient) => {
      const mimeMessage = buildMimeMessage(recipient);

      // base64url encode
      const encoded = btoa(unescape(encodeURIComponent(mimeMessage)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: encoded }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Gmail send failed");
      }
      return res.json();
    }));

    const failed = results.filter(r => r.status === "rejected");
    const sent = results.filter(r => r.status === "fulfilled");

    // Log to AIActivityLog
    try {
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: brokerage_id || user.data?.brokerage_id || "",
        transaction_id: transaction_id || "",
        deadline_type: "general_email",
        recipient_email: recipients.join(", "),
        subject,
        message: finalHtml,
        response_status: "sent",
      });
    } catch (logErr) {
      console.warn("Email log failed:", logErr.message);
    }

    if (sent.length === 0) {
      return Response.json({ error: failed[0]?.reason?.message || "All sends failed" }, { status: 502 });
    }

    return Response.json({ success: true, sent: sent.length, failed: failed.length });
  } catch (error) {
    console.error("sendGmailEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});