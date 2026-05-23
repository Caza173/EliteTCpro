import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Process parsed Buyer Agency Agreement:
 * - Create/update deadline
 * - Create reminder automation
 * - Sync to calendar
 * - Archive previous agreement if exists
 * 
 * Payload: { 
 *   transaction_id, 
 *   document_id,
 *   agreement_start_date,
 *   agreement_expiration_date,
 * }
 * 
 * NOTE: brokerage_id and agent_email are NOT trusted from the client payload.
 * They are always resolved from the authenticated transaction record.
 */

const ALLOWED_ROLES = ["admin", "owner", "tc_lead", "tc", "super_admin"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require appropriate role
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      transaction_id,
      document_id,
      agreement_expiration_date,
    } = body;

    if (!transaction_id || !agreement_expiration_date) {
      return Response.json({ error: 'Missing required fields: transaction_id, agreement_expiration_date' }, { status: 400 });
    }

    // Fetch transaction server-side — never trust client-provided brokerage_id/agent_email
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify caller owns or is assigned to this transaction
    const isMaster = ["admin", "owner", "super_admin"].includes(user.role);
    if (!isMaster && transaction.owner_user_id !== user.id && transaction.assigned_tc_id !== user.id) {
      return Response.json({ error: 'Forbidden: not your transaction' }, { status: 403 });
    }

    // Resolve trusted fields from the transaction record (not from client payload)
    const trustedBrokerageId = transaction.brokerage_id;
    const trustedAgentEmail = transaction.agent_email;

    // Determine actual expiration date (override with closing_date if under_contract)
    let effectiveExpirationDate = agreement_expiration_date;
    if (transaction.transaction_phase === "under_contract" && transaction.closing_date) {
      effectiveExpirationDate = transaction.closing_date;
    }

    // Archive prior buyer agency agreement documents
    if (document_id) {
      try {
        const docs = await base44.asServiceRole.entities.Document.filter({
          transaction_id,
          doc_type: "buyer_agency_agreement",
        });
        for (const doc of docs) {
          if (doc.id !== document_id) {
            await base44.asServiceRole.entities.Document.update(doc.id, { is_deleted: true });
          }
        }
      } catch (_) {
        // Silent fail on archival
      }
    }

    // Update transaction with expiration deadline
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      agreement_expiration_deadline: effectiveExpirationDate,
      last_activity_at: new Date().toISOString(),
    });

    // Create in-app notification — only if transaction has an agent email
    if (trustedAgentEmail) {
      await base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: trustedBrokerageId,
        user_email: trustedAgentEmail,
        transaction_id,
        title: "Buyer Agency Agreement Expiring",
        body: `Buyer Agency Agreement expires on ${effectiveExpirationDate}. Review and renew if needed.`,
        type: "deadline",
        deadline_type: "buyer_agency_agreement",
        severity: "warning",
      });
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      transaction_id,
      brokerage_id: trustedBrokerageId,
      action: "buyer_agency_agreement_processed",
      entity_type: "document",
      entity_id: document_id || null,
      description: `Buyer Agency Agreement expiration set to ${effectiveExpirationDate}`,
      actor_email: user.email,
      actor_user_id: user.id,
    });

    const reminderDate = new Date(effectiveExpirationDate);
    reminderDate.setDate(reminderDate.getDate() - 3);

    return Response.json({
      success: true,
      deadline_created: true,
      effective_expiration_date: effectiveExpirationDate,
      reminder_date: reminderDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error("[processBuyerAgencyAgreement] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});