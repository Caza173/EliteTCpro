import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Automation trigger: When Buyer Agency Agreement document is uploaded
 * 
 * Receives Document entity event with:
 * - transaction_id
 * - doc_type: "buyer_agency_agreement"
 * - file_url
 * - brokerage_id
 * 
 * Flow:
 * 1. Parse document to extract Section 3 dates
 * 2. Create deadline and reminders
 * 3. Sync to calendars
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data } = body;
    
    if (!data || event.type !== 'create') {
      return Response.json({ success: true }); // Ignore non-create events
    }

    const document = data;
    
    // Only process buyer agency agreements
    if (document.doc_type !== "buyer_agency_agreement") {
      return Response.json({ success: true });
    }

    if (!document.file_url || !document.transaction_id) {
      return Response.json({ error: 'Missing file_url or transaction_id' }, { status: 400 });
    }

    // Step 1: Parse the PDF to extract dates from Section 3
    const parseRes = await base44.asServiceRole.functions.invoke('parseBuyerAgencyAgreement', {
      file_url: document.file_url,
      transaction_id: document.transaction_id,
      brokerage_id: document.brokerage_id,
    });

    if (!parseRes.agreement_expiration_date) {
      // Missing dates - already flagged as compliance issue in parser
      return Response.json({ success: true, warning: 'No expiration date found' });
    }

    // Get agent email from transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      id: document.transaction_id,
    });
    const transaction = transactions[0];
    const agentEmail = transaction?.agent_email || transaction?.buyers_agent_email;

    // Step 2: Process the agreement (create deadline, reminders, etc.)
    const processRes = await base44.asServiceRole.functions.invoke('processBuyerAgencyAgreement', {
      transaction_id: document.transaction_id,
      brokerage_id: document.brokerage_id,
      document_id: document.id,
      agreement_start_date: parseRes.agreement_start_date,
      agreement_expiration_date: parseRes.agreement_expiration_date,
      agent_email: agentEmail,
    });

    // Step 3: Update document with parsed metadata
    await base44.asServiceRole.entities.Document.update(document.id, {
      notes: `Parsed Section 3: Effective ${parseRes.agreement_start_date} through ${parseRes.agreement_expiration_date}`,
    });

    // Log audit
    await base44.asServiceRole.entities.AuditLog.create({
      brokerage_id: document.brokerage_id,
      transaction_id: document.transaction_id,
      actor_email: "system",
      action: "buyer_agency_agreement_processed",
      entity_type: "document",
      entity_id: document.id,
      description: `Buyer Agency Agreement processed: expiration ${parseRes.agreement_expiration_date}`,
    });

    return Response.json({
      success: true,
      deadline_created: true,
      expiration_date: parseRes.agreement_expiration_date,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});