import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Deadline Engine — evaluates all active transaction deadlines
 * and creates deduplicated InAppNotification records.
 *
 * Can be called:
 * - By scheduled automation (every 30 min)
 * - On-demand from frontend (transaction load / deadline update)
 *
 * Payload (optional): { transaction_id } — to scope to a single transaction
 */

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",   type: "earnest_money" },
  { key: "inspection_deadline",    label: "Inspection Deadline",     type: "inspection" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline",  type: "due_diligence" },
  { key: "financing_deadline",     label: "Financing Commitment",    type: "financing" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline",      type: "appraisal" },
  { key: "closing_date",           label: "Closing / Transfer of Title", type: "closing" },
];

const MS_PER_HOUR = 1000 * 60 * 60;

/**
 * Determine notification severity based on hours remaining.
 * Returns null if no notification needed.
 */
function getSeverity(hoursRemaining) {
  if (hoursRemaining < 0)   return "critical";
  if (hoursRemaining <= 12) return "urgent";
  if (hoursRemaining <= 24) return "warning";
  if (hoursRemaining <= 48) return "notice";
  return null;
}

/**
 * Determine addendum status.
 */
function getAddendumStatus({ addendum_override, extension_exists, contingency_active, hoursRemaining }) {
  if (addendum_override)   return "NOT_REQUIRED";
  if (extension_exists)    return "COMPLETED";
  if (contingency_active && hoursRemaining <= 24) return "REQUIRED";
  return "NOT_REQUIRED";
}

/**
 * Build a human-readable message for the notification.
 */
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

    // Auth: allow authenticated users (for on-demand calls) or service role (scheduled)
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    let payload = {};
    try { payload = await req.json(); } catch {}

    const { transaction_id } = payload;

    // Fetch transactions
    let transactions;
    if (transaction_id) {
      const tx = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, status: "active" });
      transactions = tx;
    } else {
      transactions = await base44.asServiceRole.entities.Transaction.filter({ status: "active" });
    }

    // Fetch contingencies for active transactions (bulk lookup)
    const txIds = transactions.map(t => t.id);
    let allContingencies = [];
    if (txIds.length > 0) {
      // Fetch in batches if needed — for now, fetch all
      allContingencies = await base44.asServiceRole.entities.Contingency.filter({ is_active: true });
    }

    let totalCreated = 0;
    const now = new Date();

    for (const tx of transactions) {
      const txContingencies = allContingencies.filter(c => c.transaction_id === tx.id);

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

        // ── Normalization: find active extension for this deadline type ──────
        const matchingContingency = txContingencies.find(c =>
          c.contingency_type?.toLowerCase().includes(field.type.replace("_", " ")) ||
          c.sub_type?.toLowerCase().includes(field.type.replace("_", " "))
        );

        // Determine effective date (extension takes precedence)
        let effectiveDate = originalDate;
        let extension_exists = false;
        let extension_new_date = null;
        let contingency_active = matchingContingency ? matchingContingency.is_active : true;
        const contingencyStatus = matchingContingency?.status || null;
        const addendum_override = tx[`${field.key}_addendum_override`] || false;

        // Check if contingency was extended (status = "extended" or has a new due_date different from tx field)
        if (matchingContingency && matchingContingency.due_date && matchingContingency.due_date !== originalDate) {
          extension_exists = true;
          extension_new_date = matchingContingency.due_date;
          effectiveDate = matchingContingency.due_date;
        }

        // ── Skip conditions ────────────────────────────────────────────────
        if (!contingency_active) continue;
        if (contingencyStatus === "Completed" || contingencyStatus === "Waived") continue;

        // ── Time calculation ───────────────────────────────────────────────
        const effectiveMs = new Date(effectiveDate + (effectiveDate.includes("T") ? "" : "T23:59:59")).getTime();
        const hoursRemaining = (effectiveMs - now.getTime()) / MS_PER_HOUR;

        // ── Severity ───────────────────────────────────────────────────────
        const severity = getSeverity(hoursRemaining);
        if (!severity) continue;

        // ── Addendum status ────────────────────────────────────────────────
        const addendumStatus = getAddendumStatus({
          addendum_override,
          extension_exists,
          contingency_active,
          hoursRemaining,
        });

        // ── Deduplication ─────────────────────────────────────────────────
        // Check for existing non-dismissed notification with same deadline + severity
        const existing = await base44.asServiceRole.entities.InAppNotification.filter({
          transaction_id: tx.id,
          deadline_field: field.key,
        });

        const alreadyExists = existing.some(n =>
          n.severity === severity &&
          !n.dismissed
        );

        if (alreadyExists) continue;

        // ── Build notification ─────────────────────────────────────────────
        const recipients = [tx.agent_email].filter(Boolean);
        if (!recipients.length) continue;

        const message = buildMessage(field.label, hoursRemaining);

        if (!tx.brokerage_id) continue;
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
              severity: severity,
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