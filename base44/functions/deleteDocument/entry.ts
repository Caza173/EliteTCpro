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

    console.log(`[deleteDocument] Deleting document_id=${document_id} by user=${user.email}`);

    // Try service role first (bypasses RLS)
    try {
      await base44.asServiceRole.entities.Document.delete(document_id);
      console.log(`[deleteDocument] SUCCESS (service role): ${document_id}`);
      return Response.json({ success: true, document_id });
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('404') || msg.includes('not found')) {
        // Already deleted — treat as success
        console.log(`[deleteDocument] Already gone (service role 404): ${document_id}`);
        return Response.json({ success: true, already_deleted: true, document_id });
      }
      console.log(`[deleteDocument] Service role failed: ${e.message} — trying user-scoped`);
    }

    // Fallback: user-scoped delete
    try {
      await base44.entities.Document.delete(document_id);
      console.log(`[deleteDocument] SUCCESS (user-scoped): ${document_id}`);
      return Response.json({ success: true, document_id });
    } catch (e2) {
      const msg2 = String(e2?.message || '').toLowerCase();
      if (msg2.includes('404') || msg2.includes('not found')) {
        console.log(`[deleteDocument] Already gone (user-scoped 404): ${document_id}`);
        return Response.json({ success: true, already_deleted: true, document_id });
      }
      console.log(`[deleteDocument] Both delete attempts failed: ${e2.message}`);
      return Response.json({ error: `Delete failed: ${e2.message}` }, { status: 500 });
    }

  } catch (error) {
    console.log(`[deleteDocument] Unexpected error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});