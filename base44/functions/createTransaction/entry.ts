import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;
    const agent = body.agent || user.full_name || user.email || '';

    // Strip fields that must not come from client input
    const { created_by: _stripped, team_id: _team, ...safeBody } = body;

    // CRITICAL: Use user-scoped client (base44.entities, NOT asServiceRole)
    // This ensures the platform auto-stamps created_by = the calling user's UUID
    const tx = await base44.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      agent_email: safeBody.agent_email || user.email || undefined,
    });

    console.log('[createTransaction] created tx.id:', tx.id, '| created_by:', tx.created_by, '| user.id:', user.id);

    return Response.json(tx);
  } catch (error) {
    console.error('[createTransaction] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});