import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc'];
    const isMaster = user.email === 'nhcazateam@gmail.com';
    if (!isMaster && !allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { document_id } = await req.json();
    if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });

    // Try user-scoped delete first, then fall back to service role
    let deleted = false;
    try {
      await base44.entities.Document.delete(document_id);
      deleted = true;
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('404') || msg.includes('not found')) {
        deleted = true; // already gone
      }
    }

    if (!deleted) {
      try {
        await base44.asServiceRole.entities.Document.delete(document_id);
      } catch (e) {
        const msg = String(e?.message || '').toLowerCase();
        if (!msg.includes('404') && !msg.includes('not found')) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});