import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Called by entity automation when a Transaction is updated.
// Runs deadline monitoring and financial checks (no document needed).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct invocation and entity automation payload
    const event = body?.event;
    let transactionId = body?.transaction_id;
    let txData = body?.transaction_data;

    // If called from entity automation
    if (event?.entity_id && !transactionId) {
      transactionId = event.entity_id;
    }

    if (!transactionId) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    // Fetch transaction if not provided
    if (!txData) {
      const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transactionId });
      txData = txList[0];
    }
    if (!txData) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Fetch finance record
    const financeList = await base44.asServiceRole.entities.TransactionFinance.filter({ transaction_id: transactionId });
    const finance = financeList[0] || {};

    // Fetch checklist items
    const checklistItems = await base44.asServiceRole.entities.DocumentChecklistItem.filter({ transaction_id: transactionId });

    await base44.asServiceRole.functions.invoke("complianceEngine", {
      transaction_id: transactionId,
      brokerage_id: txData.brokerage_id,
      transaction_data: {
        address: txData.address,
        transaction_type: txData.transaction_type,
        is_cash_transaction: txData.is_cash_transaction,
        sale_price: finance.sale_price || txData.sale_price,
        seller_concession_amount: finance.seller_concession_amount || 0,
        professional_fee_amount: finance.professional_fee_amount || 0,
        phase: txData.phase || 1,
        brokerage_id: txData.brokerage_id,
        inspection_deadline: txData.inspection_deadline,
        appraisal_deadline: txData.appraisal_deadline,
        financing_deadline: txData.financing_deadline,
        earnest_money_deadline: txData.earnest_money_deadline,
        due_diligence_deadline: txData.due_diligence_deadline,
        closing_date: txData.closing_date,
        ctc_target: txData.ctc_target,
        checklist_items: checklistItems,
      },
    });

    return Response.json({ success: true, transaction_id: transactionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});