import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simple in-memory rate limiter (resets on cold start, fine for low-volume use)
const requestLog = new Map();

function isRateLimited(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 3;

  const entries = (requestLog.get(key) || []).filter(t => now - t < windowMs);
  if (entries.length >= maxRequests) return true;
  entries.push(now);
  requestLog.set(key, entries);
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { action } = body;

  // ── CONTACT US ──────────────────────────────────────────────────────────────
  if (action === "contact") {
    const { name, email, brokerage, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "support@elitetc.com",
      from_name: "EliteTC Portal",
      subject: `[Contact Us] ${subject}`,
      body: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Brokerage:</strong> ${brokerage || "—"}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:3px solid #c9a227;padding-left:12px;margin-left:0;color:#555;">${message.replace(/\n/g, "<br/>")}</blockquote>
        <p style="color:#999;font-size:12px;">Submitted: ${timestamp}</p>
      `,
    });

    // Log to InAppNotification for TC team visibility
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: "support@elitetc.com",
      title: `Contact: ${subject}`,
      body: `From ${name} (${email}): ${message.substring(0, 200)}`,
      type: "system",
    });

    return Response.json({ success: true });
  }

  // ── TRANSACTION UPDATE REQUEST ───────────────────────────────────────────────
  if (action === "transaction_update") {
    const { agent_email } = body;
    if (!agent_email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (isRateLimited(agent_email)) {
      return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
    }

    // Find matching transactions by agent_email field
    const allTransactions = await base44.asServiceRole.entities.Transaction.filter({
      agent_email: agent_email.toLowerCase().trim(),
    });

    // Also try case-insensitive fallback by listing and filtering
    const allTx = await base44.asServiceRole.entities.Transaction.list();
    const matches = allTx.filter(tx =>
      tx.agent_email?.toLowerCase() === agent_email.toLowerCase().trim()
    );

    // Deduplicate
    const seen = new Set();
    const transactions = [...allTransactions, ...matches].filter(tx => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });

    const active = transactions.filter(tx => tx.status !== "cancelled" && tx.status !== "closed");

    if (active.length === 0) {
      return Response.json({ found: false });
    }

    // Build email body
    const deadlineLabels = {
      inspection_deadline: "Inspection",
      appraisal_deadline: "Appraisal",
      financing_deadline: "Financing",
      due_diligence_deadline: "Due Diligence",
      earnest_money_deadline: "Earnest Money",
      closing_date: "Closing",
    };

    const statusLabels = {
      active: "Under Contract",
      pending: "Pending",
      closed: "Closed",
    };

    const today = new Date();

    function getNextDeadline(tx) {
      const upcoming = [];
      for (const [field, label] of Object.entries(deadlineLabels)) {
        if (tx[field]) {
          const d = new Date(tx[field]);
          if (d >= today) upcoming.push({ label, date: d, raw: tx[field] });
        }
      }
      upcoming.sort((a, b) => a.date - b.date);
      return upcoming[0] || null;
    }

    function getOpenTasks(tx) {
      if (!tx.tasks) return [];
      return tx.tasks.filter(t => !t.completed);
    }

    const sections = active.map(tx => {
      const nextDeadline = getNextDeadline(tx);
      const openTasks = getOpenTasks(tx);
      const deadlineStr = nextDeadline
        ? `${nextDeadline.label} – ${new Date(nextDeadline.raw).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
        : "No upcoming deadlines";
      const tasksStr = openTasks.length > 0
        ? openTasks.slice(0, 2).map(t => `• ${t.name}`).join("<br/>")
        : "All tasks complete";

      return `
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:16px;">
          <h3 style="margin:0 0 8px;color:#0f172a;font-size:16px;">${tx.address}</h3>
          <p style="margin:4px 0;color:#475569;"><strong>Status:</strong> ${statusLabels[tx.status] || tx.status}</p>
          <p style="margin:4px 0;color:#475569;"><strong>Next Deadline:</strong> ${deadlineStr}</p>
          <p style="margin:4px 0;color:#475569;"><strong>Outstanding Tasks:</strong></p>
          <div style="margin-left:12px;color:#64748b;font-size:14px;">${tasksStr}</div>
        </div>
      `;
    }).join("");

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: agent_email,
      from_name: "EliteTC",
      subject: "Your EliteTC Transaction Update",
      body: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#c9a227;font-size:24px;margin:0;">EliteTC</h1>
            <p style="color:#64748b;margin:4px 0;">Transaction Coordinator Platform</p>
          </div>
          <h2 style="color:#0f172a;font-size:18px;margin-bottom:6px;">Here is the current status of your transactions:</h2>
          <p style="color:#64748b;font-size:14px;margin-bottom:20px;">${active.length} active deal${active.length !== 1 ? "s" : ""} found for ${agent_email}</p>
          ${sections}
          <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;">For full details, log into the <strong>Agent Portal</strong>.</p>
            <p style="color:#94a3b8;font-size:11px;margin-top:4px;">This is an automated update. Do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    return Response.json({ found: true, count: active.length });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});