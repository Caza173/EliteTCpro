import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;
    const agent = body.agent || user.full_name || user.email || '';

    // Strip incoming created_by — we always set it explicitly to user.id (UUID)
    const { created_by: _stripped, team_id: _team, ...safeBody } = body;

    // Use asServiceRole so we can explicitly set created_by = user.id (UUID)
    // This ensures the RLS filter (created_by = user.id) always matches
    const tx = await base44.asServiceRole.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      agent_email: safeBody.agent_email || user.email || undefined,
      created_by: user.id,
    });

    console.log('[createTransaction] created tx.id:', tx.id, '| created_by:', tx.created_by, '| user.id:', user.id);

    return Response.json(tx);
  } catch (error) {
    console.error('[createTransaction] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});