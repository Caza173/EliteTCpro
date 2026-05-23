import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STAFF_ROLES = ["admin", "owner", "tc_lead", "tc"];

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
  senderName = "EliteTC",
  senderRole = "EliteTC Operations",
  companyName = "EliteTC",
  phoneNumber = "",
  customBody,
  signatureOverrideHtml,
}) {
  const sigBlock = signatureOverrideHtml || `<p style="margin:0;color:#475569;font-size:13px;line-height:1.8;">
    <strong>${senderName}</strong><br/>
    ${senderRole}<br/>
    ${companyName}<br/>
    ${phoneNumber}
  </p>`;

  if (customBody && !propertyAddress) {
    return `
<div style="font-family:Arial,Inter,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;font-size:14px;">
  ${recipientName ? `<p style="margin:0 0 16px;">Hi ${recipientName},</p>` : ""}
  <div style="margin:0 0 24px;">${customBody.replace(/\n/g, "<br/>")}</div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
  ${sigBlock}
</div>`;
  }

  const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>`;

  const txSummary = propertyAddress ? `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Transaction Summary</p>
    <ul style="margin:0;padding:0;list-style:none;">
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
  ${sigBlock}
</div>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) {
      return Response.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      to,
      cc,
      subject,
      body: emailBody,
      htmlBody,
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
      fromName,
    } = body;

    if (!to) return Response.json({ error: "Recipient required" }, { status: 400 });
    if (!subject) return Response.json({ error: "Subject required" }, { status: 400 });

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (!recipients.length) return Response.json({ error: "No valid recipients" }, { status: 400 });

    // If transaction_id provided, verify ownership — also prevents cross-tenant attachment access
    let verifiedTx = null;
    let resolvedBrokerageId = user.data?.brokerage_id || "";
    if (transaction_id) {
      verifiedTx = await base44.asServiceRole.entities.Transaction.get(transaction_id);
      if (!verifiedTx || ![verifiedTx.owner_user_id, verifiedTx.created_by, verifiedTx.assigned_tc_id].includes(user.id)) {
        return Response.json({ error: "Transaction not found or access denied" }, { status: 404 });
      }
      resolvedBrokerageId = verifiedTx.brokerage_id || resolvedBrokerageId;
    }

    // Normalize CC list
    const ccRecipients = cc
      ? (Array.isArray(cc) ? cc.filter(Boolean) : cc.split(",").map(s => s.trim()).filter(Boolean))
      : [];

    // Use user's saved signature fields as fallback defaults
    const sigName    = senderName   || user.data?.sig_name    || user.full_name  || "EliteTC";
    const sigRole    = senderRole   || user.data?.sig_role    || "EliteTC Operations";
    const sigCompany = companyName  || user.data?.sig_company || user.data?.company_name || "EliteTC";
    const sigPhone   = phoneNumber  || user.data?.sig_phone   || user.data?.phone || "";
    const sigWebsite = user.data?.website || "";
    const sigPhotoUrl = user.data?.profile_photo_url || "";
    const sigLogoUrl  = user.data?.company_logo_url || "";
    const useCustomSig = user.data?.signature_type === "custom" && user.data?.custom_signature_html;

    // Build system signature block
    const systemSigHtml = useCustomSig
      ? user.data.custom_signature_html
      : `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#475569;line-height:1.6;margin-top:8px;">
          <tr>
            ${sigPhotoUrl ? `<td style="padding-right:12px;vertical-align:top;"><img src="${sigPhotoUrl}" width="40" height="40" style="border-radius:50%;object-fit:cover;" /></td>` : ""}
            <td style="vertical-align:top;">
              <strong style="color:#0f172a;font-size:14px;">${sigName}</strong><br/>
              ${sigRole ? `<span>${sigRole}</span><br/>` : ""}
              ${sigCompany ? `<span>${sigCompany}</span><br/>` : ""}
              ${sigPhone ? `<span>${sigPhone}</span><br/>` : ""}
              ${sigWebsite ? `<a href="${sigWebsite}" style="color:#2563eb;">${sigWebsite}</a><br/>` : ""}
            </td>
            ${sigLogoUrl ? `<td style="padding-left:16px;vertical-align:middle;"><img src="${sigLogoUrl}" height="36" style="object-fit:contain;" /></td>` : ""}
          </tr>
        </table>`;

    // Build final HTML
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
      signatureOverrideHtml: systemSigHtml,
    });

    if (!finalHtml) return Response.json({ error: "Body required" }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    // Fetch attachments ONLY from the verified transaction's documents
    const attachmentDocIds = body.attachment_document_ids || [];
    const attachments = [];
    if (attachmentDocIds.length > 0 && verifiedTx) {
      const docs = await base44.asServiceRole.entities.Document.filter({ transaction_id: verifiedTx.id });
      for (const doc of docs) {
        if (!attachmentDocIds.includes(doc.id) || !doc.file_url) continue;
        try {
          const fileRes = await fetch(doc.file_url);
          if (!fileRes.ok) continue;
          const arrayBuf = await fileRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuf);
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
        return [
          `From: ${fromLabel} <me>`,
          `To: ${recipient}`,
          ...(ccRecipients.length ? [`Cc: ${ccRecipients.join(", ")}`] : []),
          `Subject: ${encodedSubject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          finalHtml,
        ].join("\r\n");
      }

      const parts = [];
      parts.push(
        `From: ${fromLabel} <me>`,
        `To: ${recipient}`,
        ...(ccRecipients.length ? [`Cc: ${ccRecipients.join(", ")}`] : []),
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

      for (const att of attachments) {
        const safeName = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(att.fileName)))}?=`;
        parts.push(
          ``,
          `--${boundary}`,
          `Content-Type: ${att.mimeType}; name="${safeName}"`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${safeName}"`,
          ``,
          att.b64.match(/.{1,76}/g).join("\r\n"),
        );
      }

      parts.push(``, `--${boundary}--`);
      return parts.join("\r\n");
    };

    const results = await Promise.allSettled(recipients.map(async (recipient) => {
      const mimeMessage = buildMimeMessage(recipient);
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

    // Log — brokerage_id resolved server-side only
    try {
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: resolvedBrokerageId,
        transaction_id: transaction_id || "",
        deadline_type: "general_email",
        recipient_email: recipients.join(", "),
        subject,
        message: `Sender: ${user.id}\nTo: ${recipients.join(", ")}\nCC: ${ccRecipients.join(", ") || "none"}\nTimestamp: ${new Date().toISOString()}`,
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