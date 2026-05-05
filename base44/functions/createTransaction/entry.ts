import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // brokerage_id is optional — new users may not have one yet
    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;

    // Ensure agent field is always populated — required by schema
    const agent = body.agent || user.full_name || user.email || '';

    // Strip created_by from body — must be set by the platform from the auth token, not from input
    const { created_by: _stripped, team_id: _team, ...safeBody } = body;

    // CRITICAL: Use user-scoped client (base44.entities, NOT base44.asServiceRole.entities)
    // This ensures created_by is stamped as user.id (UUID) by the platform automatically
    const tx = await base44.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      agent_email: safeBody.agent_email || user.email || undefined,
    });

    console.log('[createTransaction] created tx.id:', tx.id, '| created_by:', tx.created_by, '| agent:', tx.agent);

    // If newly created deal is pending and unassigned, notify TCs
    if (tx.status === 'pending' && !tx.assigned_tc_id) {
      base44.asServiceRole.functions.invoke('notifyTCsOfNewDeal', {
        transaction_id: tx.id,
        data: tx,
      }).catch(e => console.error('notifyTCsOfNewDeal error:', e.message));
    }

    return Response.json(tx);
  } catch (error) {
    console.error('[createTransaction] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});