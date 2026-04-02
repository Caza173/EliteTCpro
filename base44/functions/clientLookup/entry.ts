import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const code = (body.code || "").trim().toUpperCase();

    if (!code) {
      return Response.json({ error: 'Access code is required' }, { status: 400 });
    }

    // Use service role to bypass RLS (same pattern as portalSupport)
    const allTransactions = await base44.asServiceRole.entities.Transaction.list("-updated_date", 2000);

    const tx = allTransactions.find(t => (t.client_access_code || "").trim().toUpperCase() === code);

    if (!tx) {
      return Response.json({ 
        error: 'No transaction found for this code.',
        debug_count: allTransactions.length,
      }, { status: 404 });
    }

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
      risk_level: tx.risk_level,
      health_score: tx.health_score,
      last_activity_at: tx.last_activity_at || tx.updated_date,
      agent_email: tx.agent_email,
      client_email: tx.client_email,
      client_emails: tx.client_emails || [],
      client_phone: tx.client_phone,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});