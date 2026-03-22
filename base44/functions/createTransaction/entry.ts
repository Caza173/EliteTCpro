import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Get brokerage_id from user profile or fall back to first brokerage (service role can see all)
    let brokerage_id = user.data?.brokerage_id || body.brokerage_id;
    if (!brokerage_id) {
      const brokerages = await base44.asServiceRole.entities.Brokerage.list();
      brokerage_id = brokerages[0]?.id;
    }
    if (!brokerage_id) {
      return Response.json({ error: 'No brokerage found' }, { status: 400 });
    }

    const tx = await base44.asServiceRole.entities.Transaction.create({
      ...body,
      brokerage_id,
    });

    return Response.json(tx);
  } catch (error) {
    console.error('createTransaction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});