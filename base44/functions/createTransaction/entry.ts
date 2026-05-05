import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // brokerage_id is optional — new users may not have one yet
    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;

    // Resolve team_id: use provided or default to creator's first team
    let team_id = body.team_id || null;
    if (!team_id) {
      try {
        const memberships = await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id });
        if (memberships.length) team_id = memberships[0].team_id;
      } catch (e) {
        console.warn('[createTransaction] could not fetch team memberships:', e.message);
      }
    }

    // Ensure agent field is always populated — required by schema
    const agent = body.agent || user.full_name || user.email || '';

    // Use user-scoped client so Base44 auto-stamps created_by = user.id (system field)
    // Explicitly strip created_by from body to prevent email override
    const { created_by: _stripped, ...safeBody } = body;
    const tx = await base44.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      team_id: team_id || undefined,
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