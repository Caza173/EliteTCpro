import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const { to, subject, body: emailBody, transaction_id, brokerage_id, fromName } = body;

    if (!to) return Response.json({ error: "Recipient required" }, { status: 400 });
    if (!subject) return Response.json({ error: "Subject required" }, { status: 400 });
    if (!emailBody) return Response.json({ error: "Body required" }, { status: 400 });

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (!recipients.length) return Response.json({ error: "No valid recipients" }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    // Send to each recipient
    const results = await Promise.allSettled(recipients.map(async (recipient) => {
      const htmlBody = emailBody.includes("<") ? emailBody : emailBody.replace(/\n/g, "<br/>");
      const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      const mimeMessage = [
        `From: ${fromName || "EliteTC"} <me>`,
        `To: ${recipient}`,
        `Subject: ${encodedSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
      ].join("\r\n");

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
        message: emailBody,
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