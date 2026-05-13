/**
 * notifyAgent — Sends email notifications to agents for key transaction events.
 *
 * Triggered by entity automations (Transaction updates, Document creates).
 *
 * Supported events:
 *   - transaction_phase_changed  → notifies agent when transaction_phase changes
 *   - document_uploaded          → notifies agent when a new document is uploaded
 *
 * Can also be called directly with action = "phase_changed" | "document_uploaded"
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PHASE_LABELS = {
  intake:          "Intake",
  under_contract:  "Under Contract",
  inspection:      "Inspection",
  financing:       "Financing",
  appraisal:       "Appraisal",
  clear_to_close:  "Clear to Close ✅",
  closing:         "Closing",
  closed:          "Closed 🎉",
};

function buildPhaseEmail(tx, newPhase) {
  const label = PHASE_LABELS[newPhase] || newPhase;
  return {
    subject: `📋 Phase Update: ${label} — ${tx.address}`,
    body: `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 8px;">Transaction Phase Update</h2>
  <p style="color:#475569;font-size:14px;margin:0 0 20px;">
    <strong>${tx.address}</strong> has moved to the <strong>${label}</strong> phase.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      <tr><td style="color:#64748b;padding:4px 0;width:40%;">Property</td><td style="color:#0f172a;">${tx.address}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">New Phase</td><td style="color:#0f172a;font-weight:600;">${label}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">Agent</td><td style="color:#0f172a;">${tx.agent || '—'}</td></tr>
      ${tx.closing_date ? `<tr><td style="color:#64748b;padding:4px 0;">Closing Date</td><td style="color:#0f172a;">${tx.closing_date}</td></tr>` : ''}
    </table>
  </div>
  <p style="color:#94a3b8;font-size:12px;">Log in to EliteTC to view the full transaction details.</p>
</div>`.trim(),
  };
}

function buildDocumentEmail(tx, doc) {
  const docName = doc.file_name || doc.doc_type || "New Document";
  return {
    subject: `📄 New Document Ready for Review — ${tx.address}`,
    body: `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 8px;">New Document Uploaded</h2>
  <p style="color:#475569;font-size:14px;margin:0 0 20px;">
    A new document has been uploaded to <strong>${tx.address}</strong> and is ready for your review.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      <tr><td style="color:#64748b;padding:4px 0;width:40%;">Document</td><td style="color:#0f172a;font-weight:600;">${docName}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">Property</td><td style="color:#0f172a;">${tx.address}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">Uploaded By</td><td style="color:#0f172a;">${doc.uploaded_by || '—'}</td></tr>
    </table>
  </div>
  <p style="color:#94a3b8;font-size:12px;">Log in to EliteTC to view and review the document.</p>
</div>`.trim(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Support both direct calls and entity automation payloads
    const { action, event, data, old_data } = body;

    // ── Entity automation: Transaction updated ───────────────────────────────
    if (event?.type === "update" && event?.entity_name === "Transaction") {
      const tx = data;
      const oldTx = old_data;
      if (!tx || !oldTx) return Response.json({ skipped: "no data" });

      // Only care about phase changes
      if (tx.transaction_phase === oldTx.transaction_phase) {
        return Response.json({ skipped: "phase unchanged" });
      }

      const agentEmail = tx.agent_email;
      if (!agentEmail) return Response.json({ skipped: "no agent email" });

      const { subject, body: emailBody } = buildPhaseEmail(tx, tx.transaction_phase);

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: agentEmail,
        from_name: "EliteTC",
        subject,
        body: emailBody,
      });

      // In-app notification
      await base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: tx.brokerage_id || null,
        transaction_id: tx.id,
        user_email: agentEmail,
        title: subject,
        body: `${tx.address} moved to ${PHASE_LABELS[tx.transaction_phase] || tx.transaction_phase}`,
        type: "phase",
        severity: "notice",
        dismissed: false,
      }).catch(() => {});

      console.log(`[notifyAgent] Phase change email sent to ${agentEmail} for tx ${tx.id}: ${oldTx.transaction_phase} → ${tx.transaction_phase}`);
      return Response.json({ success: true, event: "phase_changed", sent_to: agentEmail });
    }

    // ── Entity automation: Document created ─────────────────────────────────
    if (event?.type === "create" && event?.entity_name === "Document") {
      const doc = data;
      if (!doc?.transaction_id) return Response.json({ skipped: "no transaction_id" });

      // Fetch the transaction
      const txList = await base44.asServiceRole.entities.Transaction.filter({ id: doc.transaction_id });
      const tx = txList[0];
      if (!tx) return Response.json({ skipped: "transaction not found" });

      const agentEmail = tx.agent_email;
      if (!agentEmail) return Response.json({ skipped: "no agent email" });

      const { subject, body: emailBody } = buildDocumentEmail(tx, doc);

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: agentEmail,
        from_name: "EliteTC",
        subject,
        body: emailBody,
      });

      // In-app notification
      await base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: tx.brokerage_id || null,
        transaction_id: tx.id,
        user_email: agentEmail,
        title: subject,
        body: `New document ready for review: ${doc.file_name || doc.doc_type || "Document"}`,
        type: "document",
        severity: "notice",
        dismissed: false,
      }).catch(() => {});

      console.log(`[notifyAgent] Document upload email sent to ${agentEmail} for doc ${doc.id}`);
      return Response.json({ success: true, event: "document_uploaded", sent_to: agentEmail });
    }

    // ── Direct call fallback ─────────────────────────────────────────────────
    if (action === "phase_changed") {
      const { transaction_id, new_phase } = body;
      if (!transaction_id || !new_phase) return Response.json({ error: "transaction_id and new_phase required" }, { status: 400 });

      const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
      const tx = txList[0];
      if (!tx) return Response.json({ error: "Transaction not found" }, { status: 404 });

      const agentEmail = tx.agent_email;
      if (!agentEmail) return Response.json({ skipped: "no agent email" });

      const { subject, body: emailBody } = buildPhaseEmail(tx, new_phase);
      await base44.asServiceRole.integrations.Core.SendEmail({ to: agentEmail, from_name: "EliteTC", subject, body: emailBody });

      return Response.json({ success: true, sent_to: agentEmail });
    }

    return Response.json({ skipped: "unrecognized event" });

  } catch (error) {
    console.error("[notifyAgent] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});