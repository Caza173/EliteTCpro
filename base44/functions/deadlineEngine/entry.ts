import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",       type: "earnest_money" },
  { key: "inspection_deadline",    label: "Inspection Deadline",         type: "inspection" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline",      type: "due_diligence" },
  { key: "financing_deadline",     label: "Financing Commitment",        type: "financing" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline",          type: "appraisal" },
  { key: "closing_date",           label: "Closing / Transfer of Title", type: "closing" },
];

// Task title keywords — ANY matching completed task resolves the deadline
// Keywords are intentionally specific to completion-signifying tasks only
const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ["earnest money received", "emd received", "deposit received", "earnest money deposit received"],
  inspection_deadline:    ["inspection completed", "inspection report received", "inspection done"],
  due_diligence_deadline: ["due diligence completed", "due diligence done", "contingency removal"],
  financing_deadline:     ["clear to close", "financing commitment received", "loan commitment", "ctc received"],
  appraisal_deadline:     ["appraisal received", "appraisal completed", "appraisal done"],
  closing_date:           ["closing completed", "closed", "keys delivered", "title transferred"],
};

// Returns true if ANY linked task is completed (not ALL — one completion signal is enough)
function isDeadlineCompletedByTask(deadlineKey, txTasks = []) {
  const keywords = DEADLINE_TASK_KEYWORDS[deadlineKey];
  if (!keywords) return false;

  const linked = txTasks.filter(t =>
    keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase()))
  );

  const result = linked.some(t => t.is_completed);

  console.log(`[deadlineEngine] Task check for ${deadlineKey}:`, {
    keywordsSearched: keywords,
    matchingTasks: linked.map(t => ({ title: t.title, is_completed: t.is_completed })),
    resolvedByTask: result,
  });

  return result;
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

    let payload = {};
    try { payload = await req.json(); } catch {}

    const { transaction_id } = payload;

    let transactions;
    if (transaction_id) {
      transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, status: "active" });
    } else {
      transactions = await base44.asServiceRole.entities.Transaction.filter({ status: "active" });
    }

    console.log(`[deadlineEngine] Evaluating ${transactions.length} transaction(s)`);

    let allContingencies = [];
    if (transactions.length > 0) {
      allContingencies = await base44.asServiceRole.entities.Contingency.filter({ is_active: true });
    }

    let totalCreated = 0;
    let totalResolved = 0;
    const now = new Date();

    for (const tx of transactions) {
      if (!tx.brokerage_id) continue;

      const txContingencies = allContingencies.filter(c => c.transaction_id === tx.id);

      // Fetch tasks and existing notifications fresh from DB for this transaction
      const [existingForTx, txTasks] = await Promise.all([
        base44.asServiceRole.entities.InAppNotification.filter({ transaction_id: tx.id }),
        base44.asServiceRole.entities.TransactionTask.filter({ transaction_id: tx.id }),
      ]);

      console.log(`[deadlineEngine] TX ${tx.id} (${tx.address}): ${txTasks.length} tasks, ${existingForTx.length} existing notifications`);

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

        const taskCompleted = isDeadlineCompletedByTask(field.key, txTasks);

        // ── If linked task is completed → resolve all active alerts for this deadline ──
        if (taskCompleted) {
          const activeNotifs = existingForTx.filter(n => n.deadline_field === field.key && n.dismissed !== true);
          for (const n of activeNotifs) {
            try {
              await base44.asServiceRole.entities.InAppNotification.update(n.id, {
                dismissed: true,
                dismissed_at: new Date().toISOString(),
              });
              totalResolved++;
              console.log(`[deadlineEngine] Resolved alert ${n.id} for ${field.key} on tx ${tx.id} (task completed)`);
            } catch {}
          }
          // Also resolve MonitorAlerts
          try {
            const monitorAlerts = await base44.asServiceRole.entities.MonitorAlert.filter({
              transaction_id: tx.id,
              detail_key: field.key,
              status: "open",
            });
            for (const a of monitorAlerts) {
              await base44.asServiceRole.entities.MonitorAlert.update(a.id, {
                status: "resolved",
                resolved_at: new Date().toISOString(),
              });
            }
          } catch {}
          continue; // Do NOT create new alerts for this deadline
        }

        // ── Contingency check ─────────────────────────────────────────────────
        const matchingContingency = txContingencies.find(c =>
          c.contingency_type?.toLowerCase().includes(field.type.replace("_", " ")) ||
          c.sub_type?.toLowerCase().includes(field.type.replace("_", " "))
        );

        let effectiveDate = originalDate;
        let extension_exists = false;
        let contingency_active = matchingContingency ? matchingContingency.is_active : true;
        const contingencyStatus = matchingContingency?.status || null;
        const addendum_override = tx[`${field.key}_addendum_override`] || false;

        if (matchingContingency?.due_date && matchingContingency.due_date !== originalDate) {
          extension_exists = true;
          effectiveDate = matchingContingency.due_date;
        }

        if (!contingency_active) continue;
        if (contingencyStatus === "Completed" || contingencyStatus === "Waived") continue;

        const effectiveMs = new Date(effectiveDate + (effectiveDate.includes("T") ? "" : "T23:59:59")).getTime();
        const hoursRemaining = (effectiveMs - now.getTime()) / MS_PER_HOUR;

        console.log(`[deadlineEngine] ${field.key} for tx ${tx.id}: effectiveDate=${effectiveDate}, hoursRemaining=${Math.round(hoursRemaining)}`);

        const severity = getSeverity(hoursRemaining);
        if (!severity) {
          console.log(`[deadlineEngine] ${field.key}: no alert needed (${Math.round(hoursRemaining)}h remaining)`);
          continue;
        }

        // ── Deduplication — match on deadline_field only (deadline_type may be unset on old records) ──
        const fieldNotifications = existingForTx.filter(n => n.deadline_field === field.key);

        // If user manually dismissed this alert, respect it permanently
        const userDismissed = fieldNotifications.some(n => n.dismissed);
        if (userDismissed) {
          console.log(`[deadlineEngine] ${field.key}: skipped — user dismissed`);
          continue;
        }

        const activeNotifs = fieldNotifications.filter(n => !n.dismissed);

        // Delete all duplicates beyond the first, then update the survivor
        if (activeNotifs.length > 1) {
          const [keep, ...dupes] = activeNotifs;
          for (const dupe of dupes) {
            try { await base44.asServiceRole.entities.InAppNotification.delete(dupe.id); } catch {}
          }
          console.log(`[deadlineEngine] ${field.key}: deleted ${dupes.length} duplicate notification(s)`);
          // Update surviving notification if severity changed
          if (keep.severity !== severity) {
            await base44.asServiceRole.entities.InAppNotification.update(keep.id, {
              severity,
              title: buildMessage(field.label, hoursRemaining),
            });
          }
          continue;
        }

        // Update severity if escalated on the single existing notification
        if (activeNotifs.length === 1) {
          const activeNotif = activeNotifs[0];
          if (activeNotif.severity !== severity) {
            await base44.asServiceRole.entities.InAppNotification.update(activeNotif.id, {
              severity,
              title: buildMessage(field.label, hoursRemaining),
            });
            console.log(`[deadlineEngine] ${field.key}: escalated severity to ${severity}`);
          }
          continue;
        }

        // ── Create new notification ───────────────────────────────────────────
        const recipients = [tx.agent_email].filter(Boolean);
        if (!recipients.length) {
          console.log(`[deadlineEngine] ${field.key}: no recipient email on tx ${tx.id}`);
          continue;
        }

        const message = buildMessage(field.label, hoursRemaining);
        const addendumStatus = getAddendumStatus({ addendum_override, extension_exists, contingency_active, hoursRemaining });

        for (const email of recipients) {
          try {
            await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: tx.brokerage_id,
              transaction_id: tx.id,
              user_email: email,
              title: message,
              body: `${tx.address} — Due: ${effectiveDate}${extension_exists ? " (Extended)" : ""}`,
              type: "deadline",
              deadline_field: field.key,
              deadline_type: field.type,
              severity,
              addendum_status: addendumStatus,
              addendum_response: addendumStatus === "REQUIRED" ? "pending" : undefined,
              dismissed: false,
            });
            totalCreated++;
            console.log(`[deadlineEngine] Created ${severity} alert for ${field.key} on tx ${tx.id} → ${email}`);
          } catch (notifyErr) {
            console.warn(`[deadlineEngine] Failed to create notification for tx ${tx.id}:`, notifyErr.message);
          }
        }
      }
    }

    console.log(`[deadlineEngine] Done: ${totalCreated} created, ${totalResolved} resolved across ${transactions.length} transaction(s)`);
    return Response.json({
      success: true,
      notifications_created: totalCreated,
      notifications_resolved: totalResolved,
      transactions_evaluated: transactions.length,
    });
  } catch (error) {
    console.error("[deadlineEngine] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});