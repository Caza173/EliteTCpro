/**
 * checkSignatureBlocking
 * Evaluates whether any active transactions should be blocked
 * due to pending required signatures, and creates deadline-linked alerts.
 * 
 * Called by: entity automation on SignatureRequest updates,
 *            or manually from the frontend.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BLOCKING_DOC_TYPES = ["purchase_and_sale", "listing_agreement", "buyer_agency_agreement", "closing"];
const DEADLINE_LINKS = {
  inspection_deadline: { doc_type: "inspection", label: "Inspection Addendum" },
  financing_deadline:  { doc_type: "addendum",   label: "Financing Addendum" },
  appraisal_deadline:  { doc_type: "addendum",   label: "Appraisal Addendum" },
  due_diligence_deadline: { doc_type: "addendum", label: "Due Diligence Addendum" },
  closing_date:        { doc_type: "closing",     label: "Closing Documents" },
};

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86_400_000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let payload = {};
    try { payload = await req.json(); } catch {}
    const { transaction_id } = payload;

    // Fetch transactions to evaluate
    let transactions;
    try {
      if (transaction_id) {
        transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, status: "active" });
      } else {
        transactions = await base44.asServiceRole.entities.Transaction.filter({ status: "active" });
      }
    } catch {
      transactions = [];
    }

    let blockedCount = 0;
    let alertsCreated = 0;

    for (const tx of transactions) {
      if (!tx.brokerage_id) continue;

      const [docs, sigRequests] = await Promise.all([
        base44.asServiceRole.entities.Document.filter({ transaction_id: tx.id, is_deleted: { $ne: true } }),
        base44.asServiceRole.entities.SignatureRequest.filter({ transaction_id: tx.id }),
      ]);

      // 1. Check phase-blocking
      const criticalDocs = docs.filter(d => BLOCKING_DOC_TYPES.includes(d.doc_type));
      let isBlocked = false;

      for (const doc of criticalDocs) {
        const completedSig = sigRequests.find(s => s.document_id === doc.id && s.status === "completed");
        if (!completedSig) {
          isBlocked = true;
          break;
        }
      }

      // Update transaction blocked_by_signature
      if (tx.blocked_by_signature !== isBlocked) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          blocked_by_signature: isBlocked,
        });
      }

      if (isBlocked) blockedCount++;

      // 2. Deadline-linked signature alerts
      for (const [deadlineKey, linkInfo] of Object.entries(DEADLINE_LINKS)) {
        const deadlineDate = tx[deadlineKey];
        if (!deadlineDate) continue;

        const days = getDaysUntil(deadlineDate);
        if (days === null || days > 2) continue; // Only alert within 48 hours

        // Find linked document
        const linkedDoc = docs.find(d => d.doc_type === linkInfo.doc_type);
        if (!linkedDoc) continue;

        // Check if signature is completed
        const sig = sigRequests.find(s => s.document_id === linkedDoc.id && s.status === "completed");
        if (sig) continue; // Already signed, no alert needed

        // Determine severity
        const severity = days <= 1 ? "critical" : "warning";
        const message = `Signature required on "${linkedDoc.file_name}" before ${linkInfo.label} deadline${days <= 0 ? " (overdue)" : ` in ${days} day(s)`}`;

        // Check for existing alert
        const existingAlerts = await base44.asServiceRole.entities.InAppNotification.filter({
          transaction_id: tx.id,
          deadline_field: `sig_${deadlineKey}`,
          user_email: tx.agent_email,
        });

        if (existingAlerts.length === 0 && tx.agent_email) {
          await base44.asServiceRole.entities.InAppNotification.create({
            brokerage_id: tx.brokerage_id,
            transaction_id: tx.id,
            user_email: tx.agent_email,
            title: `Signature Required Before Deadline — ${linkInfo.label}`,
            body: message,
            type: "document",
            deadline_field: `sig_${deadlineKey}`,
            deadline_type: "signature",
            severity,
            dismissed: false,
          });

          await base44.asServiceRole.entities.AuditLog.create({
            transaction_id: tx.id,
            action: "signature_deadline_alert",
            entity_type: "document",
            entity_id: linkedDoc.id,
            description: `Alert: ${message}`,
            actor_email: "system",
          });

          alertsCreated++;
        }
      }
    }

    return Response.json({
      success: true,
      transactions_evaluated: transactions.length,
      blocked_count: blockedCount,
      alerts_created: alertsCreated,
    });

  } catch (error) {
    console.error("[checkSignatureBlocking] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});