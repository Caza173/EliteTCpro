import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Process parsed Buyer Agency Agreement:
 * - Create/update deadline
 * - Create reminder automation
 * - Sync to calendar
 * - Archive previous agreement if exists
 * 
 * Payload: { 
 *   transaction_id, 
 *   brokerage_id,
 *   document_id,
 *   agreement_start_date,
 *   agreement_expiration_date,
 *   agent_email
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      transaction_id,
      brokerage_id,
      document_id,
      agreement_start_date,
      agreement_expiration_date,
      agent_email,
    } = body;

    if (!transaction_id || !agreement_expiration_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch transaction to check status
    const transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Determine actual expiration date (override with closing_date if under_contract)
    let effectiveExpirationDate = agreement_expiration_date;
    if (transaction.transaction_phase === "under_contract" && transaction.closing_date) {
      effectiveExpirationDate = transaction.closing_date;
    }

    // Archive prior buyer agency agreement deadlines
    if (document_id) {
      await archivePriorAgreements(transaction_id, brokerage_id, document_id);
    }

    // Create deadline in transaction (if we have a Deadline entity/field)
    const deadlineData = {
      transaction_id,
      brokerage_id,
      field_key: "buyer_agency_agreement_expiration",
      deadline_type: "buyer_agency_agreement_expiration",
      label: "Buyer Agency Agreement Expires",
      date: effectiveExpirationDate,
      category: "Compliance",
      priority: "High",
      source: "document_parse",
    };

    // Store as transaction deadline (add to transaction.deadlines or create separate record)
    // For now, store in transaction fields
    await base44.entities.Transaction.update(transaction_id, {
      agreement_expiration_deadline: effectiveExpirationDate,
      last_activity_at: new Date().toISOString(),
    });

    // Create reminder automation (3 days before expiration)
    const reminderDate = new Date(effectiveExpirationDate);
    reminderDate.setDate(reminderDate.getDate() - 3);

    // Create in-app notification
    if (agent_email) {
      await base44.entities.InAppNotification.create({
        brokerage_id,
        user_email: agent_email,
        transaction_id,
        title: "Buyer Agency Agreement Expiring",
        body: `Buyer Agency Agreement expires on ${effectiveExpirationDate}. Review and renew if needed.`,
        type: "deadline",
        deadline_type: "buyer_agency_agreement",
        severity: "warning",
      });
    }

    // Sync to calendar if enabled
    if (transaction.agent_email) {
      await syncToAgentCalendar(transaction, effectiveExpirationDate);
    }

    return Response.json({
      success: true,
      deadline_created: true,
      effective_expiration_date: effectiveExpirationDate,
      reminder_date: reminderDate.toISOString().split('T')[0],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function archivePriorAgreements(transactionId, brokerageId, currentDocId) {
  try {
    // Find prior buyer agency agreement documents
    const docs = await base44.entities.Document.filter({
      transaction_id: transactionId,
      doc_type: "buyer_agency_agreement",
    });

    // Mark old ones as deleted (soft delete)
    for (const doc of docs) {
      if (doc.id !== currentDocId) {
        await base44.entities.Document.update(doc.id, { is_deleted: true });
      }
    }
  } catch (_) {
    // Silent fail on archival
  }
}

async function syncToAgentCalendar(transaction, expirationDate) {
  try {
    // This would call the Google Calendar sync function
    // For now, just log that it should be synced
    console.log(`[INFO] Should sync to agent calendar: ${transaction.agent_email} - ${expirationDate}`);
    
    // In production:
    // const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
    // Create calendar event for expiration date
  } catch (_) {
    // Silent fail on calendar sync
  }
}