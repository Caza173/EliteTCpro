import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",       type: "earnest_money" },
  { key: "inspection_deadline",    label: "Inspection Deadline",         type: "inspection" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline",      type: "due_diligence" },
  { key: "financing_deadline",     label: "Financing Commitment",        type: "financing" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline",          type: "appraisal" },
  { key: "closing_date",           label: "Closing / Transfer of Title", type: "closing" },
];

// Task title keywords that, when completed, mark the linked deadline as done
const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ["earnest money", "emd", "deposit received"],
  inspection_deadline:    ["inspection completed", "inspection scheduled", "inspection report", "inspection"],
  due_diligence_deadline: ["due diligence", "contingency removal"],
};

function isDeadlineCompletedByTask(deadlineKey, txTasks = []) {
  const keywords = DEADLINE_TASK_KEYWORDS[deadlineKey];
  if (!keywords) return false;
  const linked = txTasks.filter(t =>
    keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase()))
  );
  if (linked.length === 0) return false;
  return linked.every(t => t.is_completed);
}

const MS_PER_HOUR = 1000 * 60 * 60;

function getSeverity(hoursRemaining) {
  if (hoursRemaining < 0)   return "critical";
  if (hoursRemaining <= 12) return "urgent";
  if (hoursRemaining <= 24) return "warning";
  if (hoursRemaining <= 48) return "notice";
  return null;
}

function getAddendumStatus({ addendum_override, extension_exists, contingency_active, hoursRemaining }) {
  if (addendum_override)   return "NOT_REQUIRED";
  if (extension_exists)    return "COMPLETED";
  if (contingency_active && hoursRemaining <= 24) return "REQUIRED";
  return "NOT_REQUIRED";
}

function buildMessage(label, hoursRemaining) {
  if (hoursRemaining < 0) {
    const h = Math.abs(Math.round(hoursRemaining));
    return `${label} was due ${h} hour${h !== 1 ? "s" : ""} ago — OVERDUE`;
  }
  const h = Math.round(hoursRemaining);
  if (h < 24) return `${label} in ${h} hour${h !== 1 ? "s" : ""}`;
  const d = Math.round(h / 24);
  return `${label} in ${d} day${d !== 1 ? "s" : ""}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch {}

    let payload = {};
    try { payload = await req.json(); } catch {}

    const { transaction_id } = payload;

    let transactions;
    if (transaction_id) {
      transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, status: "active" });
    } else {
      transactions = await base44.asServiceRole.entities.Transaction.filter({ status: "active" });
    }

    const txIds = transactions.map(t => t.id);
    let allContingencies = [];
    if (txIds.length > 0) {
      allContingencies = await base44.asServiceRole.entities.Contingency.filter({ is_active: true });
    }

    let totalCreated = 0;
    const now = new Date();

    for (const tx of transactions) {
      if (!tx.brokerage_id) continue;

      const txContingencies = allContingencies.filter(c => c.transaction_id === tx.id);

      // Fetch all existing notifications and tasks for this transaction once
      const [existingForTx, txTasks] = await Promise.all([
        base44.asServiceRole.entities.InAppNotification.filter({ transaction_id: tx.id }),
        base44.asServiceRole.entities.TransactionTask.filter({ transaction_id: tx.id }),
      ]);

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

        // ── Skip if linked tasks are all completed ──────────────────────────
        if (isDeadlineCompletedByTask(field.key, txTasks)) {
          // Auto-resolve any active InAppNotifications for this field
          const activeNotifs = existingForTx.filter(n => n.deadline_field === field.key && !n.dismissed);
          for (const n of activeNotifs) {
            try { await base44.asServiceRole.entities.InAppNotification.update(n.id, { dismissed: true, dismissed_at: new Date().toISOString() }); } catch {}
          }
          // Auto-resolve any MonitorAlerts for this field
          try {
            const alerts = await base44.asServiceRole.entities.MonitorAlert.filter({
              transaction_id: tx.id,
              detail_key: field.key,
              status: "open",
            });
            for (const a of alerts) {
              await base44.asServiceRole.entities.MonitorAlert.update(a.id, { status: "resolved", resolved_at: new Date().toISOString() });
            }
          } catch {}
          continue;
        }

        const matchingContingency = txContingencies.find(c =>
          c.contingency_type?.toLowerCase().includes(field.type.replace("_", " ")) ||
          c.sub_type?.toLowerCase().includes(field.type.replace("_", " "))
        );

        let effectiveDate = originalDate;
        let extension_exists = false;
        let contingency_active = matchingContingency ? matchingContingency.is_active : true;
        const contingencyStatus = matchingContingency?.status || null;
        const addendum_override = tx[`${field.key}_addendum_override`] || false;

        if (matchingContingency && matchingContingency.due_date && matchingContingency.due_date !== originalDate) {
          extension_exists = true;
          effectiveDate = matchingContingency.due_date;
        }

        if (!contingency_active) continue;
        if (contingencyStatus === "Completed" || contingencyStatus === "Waived") continue;

        const effectiveMs = new Date(effectiveDate + (effectiveDate.includes("T") ? "" : "T23:59:59")).getTime();
        const hoursRemaining = (effectiveMs - now.getTime()) / MS_PER_HOUR;

        const severity = getSeverity(hoursRemaining);
        if (!severity) continue;

        const addendumStatus = getAddendumStatus({
          addendum_override,
          extension_exists,
          contingency_active,
          hoursRemaining,
        });

        // ── Deduplication — permanent dismiss is respected forever ──────────
        const fieldNotifications = existingForTx.filter(n => n.deadline_field === field.key && n.deadline_type === field.type);

        // If ANY notification for this deadline was dismissed, never recreate it
        const anyDismissed = fieldNotifications.some(n => n.dismissed);
        if (anyDismissed) continue;

        const activeNotifs = fieldNotifications.filter(n => !n.dismissed);

        // If there's an active (non-dismissed) notification, just update severity/title if escalated
        if (activeNotifs.length > 0) {
          const activeNotif = activeNotifs[0];
          if (activeNotif.severity !== severity) {
            await base44.asServiceRole.entities.InAppNotification.update(activeNotif.id, {
              severity,
              title: buildMessage(field.label, hoursRemaining),
            });
          }
          continue;
        }

        // ── Create new notification ───────────────────────────────────────────
        const recipients = [tx.agent_email].filter(Boolean);
        if (!recipients.length) continue;

        const message = buildMessage(field.label, hoursRemaining);

        for (const email of recipients) {
          try {
            await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: tx.brokerage_id,
              transaction_id: tx.id,
              user_email: email,
              title: message,
              body: `${tx.address} — Effective date: ${effectiveDate}${extension_exists ? " (Extended)" : ""}`,
              type: "deadline",
              deadline_field: field.key,
              deadline_type: field.type,
              severity,
              addendum_status: addendumStatus,
              addendum_response: addendumStatus === "REQUIRED" ? "pending" : undefined,
              dismissed: false,
            });
            totalCreated++;
          } catch (notifyErr) {
            console.warn(`[deadlineEngine] InAppNotification failed for tx ${tx.id}:`, notifyErr.message);
          }
        }
      }
    }

    console.log(`Deadline engine: ${totalCreated} notifications created for ${transactions.length} transactions`);
    return Response.json({ success: true, notifications_created: totalCreated, transactions_evaluated: transactions.length });
  } catch (error) {
    console.error("deadlineEngine error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});