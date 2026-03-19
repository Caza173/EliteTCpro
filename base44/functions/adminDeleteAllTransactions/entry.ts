import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    await base44.asServiceRole.entities.Transaction.delete(id);
    return Response.json({ success: true, deleted: id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});