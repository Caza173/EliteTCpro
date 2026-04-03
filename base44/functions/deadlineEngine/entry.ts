import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",       type: "earnest_money" },
  { key: "inspection_deadline",    label: "Inspection Deadline",         type: "inspection" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline",      type: "due_diligence" },
  { key: "financing_deadline",     label: "Financing Commitment",        type: "financing" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline",          type: "appraisal" },
  { key: "closing_date",           label: "Closing / Transfer of Title", type: "closing" },
];

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

      // Fetch all existing notifications for this transaction once
      const existingForTx = await base44.asServiceRole.entities.InAppNotification.filter({
        transaction_id: tx.id,
      });

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

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

        // ── Deduplication ────────────────────────────────────────────────────
        const fieldNotifications = existingForTx.filter(n => n.deadline_field === field.key);

        // Check if there's a recently dismissed notification (within 24h = snooze window)
        const dismissedNotif = fieldNotifications.find(n => n.dismissed);
        if (dismissedNotif) {
          const dismissedAt = dismissedNotif.dismissed_at ? new Date(dismissedNotif.dismissed_at) : null;
          const hoursSinceDismiss = dismissedAt ? (now.getTime() - dismissedAt.getTime()) / MS_PER_HOUR : 0;
          if (hoursSinceDismiss < 24) {
            // Still within snooze window — skip
            continue;
          } else {
            // Snooze expired — delete the old dismissed record so a fresh one gets created
            try { await base44.asServiceRole.entities.InAppNotification.delete(dismissedNotif.id); } catch {}
            // Remove from local cache so we don't find it again this loop
            const idx = existingForTx.findIndex(n => n.id === dismissedNotif.id);
            if (idx !== -1) existingForTx.splice(idx, 1);
          }
        }

        // If there's an active (non-dismissed) notification, just update severity/title if escalated
        const activeNotif = fieldNotifications.filter(n => !n.dismissed).find(Boolean);
        if (activeNotif) {
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