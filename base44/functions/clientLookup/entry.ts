import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code } = await req.json();

    if (!code) {
      return Response.json({ error: 'Access code is required' }, { status: 400 });
    }

    // Search all transactions for this code using service role (public endpoint)
    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      client_access_code: code.toUpperCase().trim()
    });

    if (!transactions || transactions.length === 0) {
      return Response.json({ error: 'No transaction found for this code.' }, { status: 404 });
    }

    const tx = transactions[0];

    // Return only safe, client-facing fields
    return Response.json({
      address: tx.address,
      status: tx.status,
      transaction_type: tx.transaction_type,
      transaction_phase: tx.transaction_phase,
      phase: tx.phase,
      phases_completed: tx.phases_completed || [],
      closing_date: tx.closing_date,
      inspection_deadline: tx.inspection_deadline,
      appraisal_deadline: tx.appraisal_deadline,
      financing_deadline: tx.financing_deadline,
      due_diligence_deadline: tx.due_diligence_deadline,
      earnest_money_deadline: tx.earnest_money_deadline,
      contract_date: tx.contract_date,
      is_cash_transaction: tx.is_cash_transaction,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});