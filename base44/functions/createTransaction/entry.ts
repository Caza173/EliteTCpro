import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;
    const agent = body.agent || user.full_name || user.email || '';

    // Strip any client-supplied ownership fields — we stamp them authoritatively
    const { created_by: _c, team_id: _t, assigned_tc_id: _a, owner_user_id: _o, ...safeBody } = body;

    console.log(`[createTransaction] user.id=${user.id} user.email=${user.email}`);

    // MUST use user-scoped client so platform stamps created_by = user.id (UUID)
    const tx = await base44.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      agent_email: safeBody.agent_email || user.email || undefined,
      // Ownership fields — stamped authoritatively by the server
      owner_user_id: user.id,
      created_by_email: user.email,
    });

    console.log(`[createTransaction] created tx.id=${tx.id} owner_user_id=${tx.owner_user_id} created_by=${tx.created_by}`);

    return Response.json(tx);
  } catch (error) {
    console.error('[createTransaction] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});