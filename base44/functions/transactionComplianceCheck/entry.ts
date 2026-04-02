import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    // Use entity automation data payload if available
    if (body?.data && !txData) {
      txData = body.data;
    }

    if (!transactionId) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    // Fetch transaction if not provided, use filter to avoid throwing on missing records
    if (!txData) {
      const results = await base44.asServiceRole.entities.Transaction.filter({ id: transactionId });
      txData = results[0] || null;
    }
    if (!txData) return Response.json({ success: true, skipped: true, reason: 'Transaction not found or deleted' }, { status: 200 });

    // Fetch finance record
    const financeList = await base44.asServiceRole.entities.TransactionFinance.filter({ transaction_id: transactionId });
    const finance = financeList[0] || {};

    // Fetch checklist items
    const checklistItems = await base44.asServiceRole.entities.DocumentChecklistItem.filter({ transaction_id: transactionId });

    try {
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
    } catch (complianceErr) {
      console.warn(`[transactionComplianceCheck] complianceEngine failed for ${transactionId}:`, complianceErr.message);
    }

    return Response.json({ success: true, transaction_id: transactionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});