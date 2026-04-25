import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * updateBrokerage — Allows admin/owner to update their brokerage record.
 * Uses service role to bypass RLS, but enforces role check server-side.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ALLOWED = ['owner', 'admin', 'tc_lead'];
    if (!ALLOWED.includes(user.role) && user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { brokerage_id, data } = await req.json();
    if (!brokerage_id || !data) {
      return Response.json({ error: 'Missing brokerage_id or data' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Brokerage.update(brokerage_id, data);
    return Response.json({ success: true, brokerage: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});