import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { document_id } = await req.json();
    if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });

    await base44.asServiceRole.entities.Document.delete(document_id);
    return Response.json({ success: true });
  } catch (error) {
    // 404 = already deleted, treat as success
    if (error?.response?.status === 404 || error?.message?.includes('404')) {
      return Response.json({ success: true });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});