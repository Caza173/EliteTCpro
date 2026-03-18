import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Template generator ───────────────────────────────────────────────────────
function buildTemplate({ propertyAddress, recipientName, issueList = [], customBody, fromName = "Team Caza" }) {
  if (customBody) {
    return {
      subject: `Action Required – ${propertyAddress}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;">${propertyAddress}</h2>
        <div style="color:#374151;line-height:1.6;">${customBody.replace(/\n/g, "<br/>")}</div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <p style="color:#94a3b8;font-size:13px;">Thank you,<br/>${fromName}</p>
      </div>`,
      text: `${customBody}\n\nThank you,\n${fromName}`,
    };
  }

  const issueItems = issueList.map(i => `<li style="margin-bottom:6px;">${i}</li>`).join("");
  const issueText = issueList.map(i => `• ${i}`).join("\n");

  const subject = `Action Required: Missing Signatures – ${propertyAddress}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="margin-bottom:4px;">Action Required</h2>
      <p style="color:#64748b;margin-top:0;">Re: ${propertyAddress}</p>
      <p>Hi ${recipientName || "there"},</p>
      <p>We are reviewing the Purchase and Sales Agreement for <strong>${propertyAddress}</strong> and identified the following items that require your attention:</p>
      ${issueList.length > 0 ? `<ul style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 16px 16px 32px;border-radius:4px;">${issueItems}</ul>` : ""}
      <p>Please address these at your earliest convenience.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="margin-bottom:0;">Thank you,<br/><strong>${fromName}</strong></p>
    </div>`;
  const text = `Hi ${recipientName || "there"},\n\nWe are reviewing the Purchase and Sales Agreement for ${propertyAddress} and identified the following items:\n\n${issueText}\n\nPlease address these at your earliest convenience.\n\nThank you,\n${fromName}`;

  return { subject, html, text };
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — TC/Admin only
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = ["admin", "owner", "tc_lead", "tc"];
    if (!allowed.includes(user.role) && user.email !== "nhcazateam@gmail.com") {
      return Response.json({ error: "Forbidden: TC or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      to,                  // string or array
      subject: customSubject,
      body: customBody,
      // Template fields (optional)
      useTemplate,
      propertyAddress,
      recipientName,
      issueList,
      fromName,
      // Logging fields
      transaction_id,
      brokerage_id,
    } = body;

    if (!to) return Response.json({ error: "Recipient (to) is required" }, { status: 400 });

    const recipients = Array.isArray(to) ? to : [to];
    const filteredRecipients = recipients.filter(Boolean);
    if (filteredRecipients.length === 0) return Response.json({ error: "No valid recipients" }, { status: 400 });

    // Build subject + body
    let finalSubject = customSubject;
    let finalHtml = customBody;

    if (useTemplate) {
      const tpl = buildTemplate({ propertyAddress, recipientName, issueList, customBody, fromName });
      finalSubject = customSubject || tpl.subject;
      finalHtml = tpl.html;
    }

    if (!finalSubject) return Response.json({ error: "Subject is required" }, { status: 400 });
    if (!finalHtml) return Response.json({ error: "Body is required" }, { status: 400 });

    // Send to each recipient
    const results = await Promise.allSettled(
      filteredRecipients.map(recipient =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient,
          subject: finalSubject,
          body: finalHtml,
          from_name: fromName || "EliteTC",
        })
      )
    );

    const failed = results.filter(r => r.status === "rejected");
    const sent = results.filter(r => r.status === "fulfilled");

    // Log to AIActivityLog
    try {
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: brokerage_id || user.data?.brokerage_id || "",
        transaction_id: transaction_id || "",
        recipient_email: filteredRecipients.join(", "),
        subject: finalSubject,
        message: finalHtml,
        response_status: failed.length === 0 ? "sent" : "pending",
      });
    } catch (logErr) {
      console.warn("Email log failed:", logErr.message);
    }

    if (sent.length === 0) {
      const errMsg = failed[0]?.reason?.message || "All sends failed";
      return Response.json({ error: errMsg }, { status: 502 });
    }

    return Response.json({
      success: true,
      sent: sent.length,
      failed: failed.length,
      recipients: filteredRecipients,
    });
  } catch (error) {
    console.error("sendEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});