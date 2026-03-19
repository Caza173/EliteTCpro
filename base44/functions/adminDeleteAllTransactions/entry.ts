import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { ids } = body;
    if (!ids || !ids.length) return Response.json({ error: 'ids required' }, { status: 400 });

    const results = await Promise.all(ids.map(async (id) => {
      try {
        await base44.asServiceRole.entities.Transaction.delete(id);
        return { id, ok: true };
      } catch (e) {
        return { id, ok: false, err: e.message };
      }
    }));
    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});