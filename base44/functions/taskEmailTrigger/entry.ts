import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Task Email Trigger — EliteTC
 *
 * Generates (and optionally sends) emails based on task completion events.
 *
 * Actions:
 *   generate   — build email draft for a specific task trigger, store as CommAutomation
 *   send       — send a specific CommAutomation record created by this engine
 *   check      — return whether a task has a pending generated email
 *   reset      — clear notification_sent flag so email can be regenerated (e.g. task unchecked)
 */

// ── Template Definitions ─────────────────────────────────────────────────────

const TRIGGER_MAP = {
  "Earnest Money Sent":                   "emd_sent",
  "Earnest Money Deposit Received":       "emd_received",
  "Earnest money deposit received":       "emd_received",
  "Earnest money deposit received + verified by Seller Agent": "emd_received",
  "Inspection Scheduled":                 "inspection_scheduled",
  "Inspection(s) scheduled":              "inspection_scheduled",
  "Inspection Completed":                 "inspection_completed",
  "Inspection completed":                 "inspection_completed",
  "Appraisal Ordered":                    "appraisal_ordered",
  "Appraisal Scheduled":                  "appraisal_scheduled",
};

function matchTrigger(taskTitle) {
  if (!taskTitle) return null;
  const lower = taskTitle.toLowerCase().trim();
  for (const [key, templateId] of Object.entries(TRIGGER_MAP)) {
    if (lower.includes(key.toLowerCase())) return templateId;
  }
  return null;
}

function fmt(val, fallback = "") {
  return val || fallback;
}

function fmtPrice(val) {
  if (!val) return "[Not Provided]";
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return String(val);
  return "$" + n.toLocaleString("en-US");
}

function fmtDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val + "T12:00:00");
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return val; }
}

function fmtTime(val) {
  if (!val) return null;
  try {
    const [h, m] = val.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${ampm}`;
  } catch { return val; }
}

// ── Email Builders ────────────────────────────────────────────────────────────

function buildEmdSent(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const lines = [
    `Hi ${buyers},`,
    "",
    `Your earnest money deposit for ${fmt(tx.address, "[Property Address]")} has been submitted.`,
    "",
    "Details:",
  ];
  if (tx.earnest_money_amount || tx.sale_price) lines.push(`  Amount: ${fmtPrice(tx.earnest_money_amount)}`);
  lines.push(`  Escrow Holder: ${fmt(tx.closing_title_company, "[Not Provided]")}`);
  lines.push("", "We will confirm once the deposit has been received.", "", `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`);

  return {
    subject: `Earnest Money Submitted – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

function buildEmdReceived(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  // Determine next milestone
  let nextMilestone = "Inspection scheduling";
  if (tx.inspection_deadline) nextMilestone = `Inspection deadline: ${fmtDate(tx.inspection_deadline)}`;
  else if (tx.financing_deadline) nextMilestone = `Financing commitment: ${fmtDate(tx.financing_deadline)}`;
  else if (tx.closing_date) nextMilestone = `Closing: ${fmtDate(tx.closing_date)}`;

  const lines = [
    `Hi ${buyers},`,
    "",
    `Your earnest money deposit has been received and confirmed.`,
    "",
    "Details:",
    `  Amount: ${fmtPrice(tx.earnest_money_amount)}`,
    `  Held By: ${fmt(tx.closing_title_company, "[Not Provided]")}`,
    `  Date Received: ${tx.earnest_money_received_date ? fmtDate(tx.earnest_money_received_date) : today}`,
    "",
    "We are all set on this requirement.",
    "",
    `Next step: ${nextMilestone}`,
    "",
    `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`,
  ];

  return {
    subject: `Earnest Money Confirmed – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

function buildInspectionScheduled(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const lines = [
    `Hi ${buyers},`,
    "",
    `Your inspection has been scheduled.`,
    "",
    "Details:",
  ];
  if (tx.inspection_deadline) lines.push(`  Date: ${fmtDate(tx.inspection_deadline)}`);
  if (tx.inspection_time) lines.push(`  Time: ${fmtTime(tx.inspection_time)}`);
  if (tx.inspector_name) lines.push(`  Inspector: ${tx.inspector_name}`);
  else lines.push("  Inspector: [Not Provided]");
  lines.push("", "Please attend if possible.", "", "Let me know if anything changes.", "", `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`);

  return {
    subject: `Inspection Scheduled – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

function buildInspectionCompleted(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const lines = [
    `Hi ${buyers},`,
    "",
    "The inspection has been completed.",
    "",
    "Next steps:",
    "  - Review the report",
    "  - Identify concerns",
    "  - Decide how to proceed before the deadline",
    "",
    "This period is time-sensitive. Let me know how you want to move forward.",
    "",
    `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`,
  ];

  return {
    subject: `Inspection Completed – Next Steps – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

function buildAppraisalOrdered(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const lines = [
    `Hi ${buyers},`,
    "",
    `The appraisal has been ordered by ${fmt(tx.lender_name, "your lender")}.`,
    "",
    "What to expect:",
    "  - Appraiser will coordinate access with the listing agent",
    "  - Typical turnaround: 7–10 business days",
    "",
    "No action needed right now.",
    "",
    `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`,
  ];

  return {
    subject: `Appraisal Ordered – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

function buildAppraisalScheduled(tx) {
  const buyers = tx.buyers?.length ? tx.buyers.join(" and ") : (tx.buyer || "there");
  const lines = [
    `Hi ${buyers},`,
    "",
    "The appraisal has been scheduled.",
    "",
    "Details:",
  ];
  if (tx.appraisal_deadline) lines.push(`  Date: ${fmtDate(tx.appraisal_deadline)}`);
  else lines.push("  Date: [Not Provided]");
  lines.push("", "We will update you once the report is complete.", "", `— ${fmt(tx.buyers_agent_name || tx.agent, "Your Agent")}`);

  return {
    subject: `Appraisal Scheduled – ${fmt(tx.address)}`,
    body: lines.join("\n"),
  };
}

const TEMPLATE_BUILDERS = {
  emd_sent:               buildEmdSent,
  emd_received:           buildEmdReceived,
  inspection_scheduled:   buildInspectionScheduled,
  inspection_completed:   buildInspectionCompleted,
  appraisal_ordered:      buildAppraisalOrdered,
  appraisal_scheduled:    buildAppraisalScheduled,
};

// Template type mapping for CommAutomation entity enum
const TEMPLATE_TYPE_MAP = {
  emd_sent:               "extension_addendum_email",  // closest available enum; stored in subject/content
  emd_received:           "financing_reminder_email",
  inspection_scheduled:   "inspection_issue_email",
  inspection_completed:   "inspection_issue_email",
  appraisal_ordered:      "closing_reminder_email",
  appraisal_scheduled:    "closing_reminder_email",
};

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = "generate", transaction_id, task_id, task_title, comm_id } = body;

    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });

    // Load transaction
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: "Transaction not found" }, { status: 404 });

    // ── CHECK — does this task have a triggered email? ────────────────────────
    if (action === "check") {
      if (!task_title) return Response.json({ has_trigger: false });
      const templateId = matchTrigger(task_title);
      if (!templateId) return Response.json({ has_trigger: false });

      // Look for an existing comm for this task
      const existing = await base44.asServiceRole.entities.CommAutomation.filter({ transaction_id });
      const match = existing.find(c => c.subject?.includes(task_title) || c.source_document_name === `task:${task_id}`);

      return Response.json({
        has_trigger: true,
        template_id: templateId,
        existing_comm: match || null,
      });
    }

    // ── GENERATE ─────────────────────────────────────────────────────────────
    if (action === "generate") {
      if (!task_title) return Response.json({ error: "task_title required" }, { status: 400 });

      const templateId = matchTrigger(task_title);
      if (!templateId) return Response.json({ error: "No email template for this task", template_id: null });

      const builder = TEMPLATE_BUILDERS[templateId];
      if (!builder) return Response.json({ error: "Template builder not found" }, { status: 500 });

      // Prevent duplicate: check if already generated for this task
      if (task_id) {
        const existing = await base44.asServiceRole.entities.CommAutomation.filter({ transaction_id });
        const dupe = existing.find(c => c.source_document_name === `task:${task_id}` && c.template_status !== "sent");
        if (dupe) {
          return Response.json({ success: true, comm: dupe, duplicate: true });
        }
      }

      const { subject, body: emailBody } = builder(tx);

      // Recipients: buyer emails
      const recipients = tx.client_emails?.length
        ? tx.client_emails
        : tx.client_email ? [tx.client_email] : [];

      const commRecord = {
        transaction_id,
        brokerage_id: tx.brokerage_id || null,
        template_type: TEMPLATE_TYPE_MAP[templateId] || "extension_addendum_email",
        template_status: "ready",
        subject,
        generated_content: emailBody,
        recipients,
        cc_recipients: [tx.agent_email].filter(Boolean),
        source_document_name: task_id ? `task:${task_id}` : null,
        contract_data_snapshot: { task_title, template_id: templateId },
      };

      const created = await base44.asServiceRole.entities.CommAutomation.create(commRecord);

      // Log
      await base44.asServiceRole.entities.AuditLog.create({
        transaction_id,
        brokerage_id: tx.brokerage_id || null,
        actor_email: user.email || "system",
        action: "task_email_generated",
        entity_type: "communication",
        entity_id: created.id,
        description: `Email generated for task "${task_title}" — template: ${templateId}`,
      }).catch(() => {});

      return Response.json({ success: true, comm: created, template_id: templateId });
    }

    // ── SEND ──────────────────────────────────────────────────────────────────
    if (action === "send") {
      if (!comm_id) return Response.json({ error: "comm_id required" }, { status: 400 });

      const comms = await base44.asServiceRole.entities.CommAutomation.filter({ id: comm_id });
      const comm = comms[0];
      if (!comm) return Response.json({ error: "Comm record not found" }, { status: 404 });
      if (comm.template_status === "blocked") {
        return Response.json({ error: "Cannot send a blocked communication" }, { status: 422 });
      }

      const allRecipients = [...(comm.recipients || []), ...(comm.cc_recipients || [])].filter(Boolean);
      for (const to of allRecipients) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: comm.subject,
          body: comm.generated_content,
        });
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.CommAutomation.update(comm_id, {
        template_status: "sent",
        sent_at: now,
        sent_by: user.email,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        transaction_id,
        brokerage_id: tx.brokerage_id || null,
        actor_email: user.email,
        action: "task_email_sent",
        entity_type: "communication",
        entity_id: comm_id,
        description: `Task email sent: "${comm.subject}" to ${(comm.recipients || []).join(", ")}`,
      }).catch(() => {});

      return Response.json({ success: true, sent_at: now });
    }

    // ── RESET — clear generated email so it can be regenerated ───────────────
    if (action === "reset") {
      if (!task_id) return Response.json({ error: "task_id required" }, { status: 400 });

      const existing = await base44.asServiceRole.entities.CommAutomation.filter({ transaction_id });
      const match = existing.find(c => c.source_document_name === `task:${task_id}`);
      if (match && match.template_status !== "sent") {
        await base44.asServiceRole.entities.CommAutomation.delete(match.id);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});