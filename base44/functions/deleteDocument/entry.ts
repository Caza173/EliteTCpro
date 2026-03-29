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

    const { document_id, transaction_id } = await req.json();
    if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });

    console.log(`[deleteDocument] document_id=${document_id} by user=${user.email}`);

    // Find the document first (for audit log)
    let doc = null;
    try {
      const results = await base44.asServiceRole.entities.Document.filter({ id: document_id });
      doc = results[0] || null;
    } catch (_) {}

    if (!doc) {
      // Already gone — idempotent success
      console.log(`[deleteDocument] Not found — already deleted: ${document_id}`);
      return Response.json({ success: true, already_deleted: true, document_id });
    }

    // Hard delete the specific record by ID
    await base44.asServiceRole.entities.Document.delete(document_id);
    console.log(`[deleteDocument] Deleted: ${document_id} (${doc.file_name})`);

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        brokerage_id: doc.brokerage_id,
        transaction_id: doc.transaction_id || transaction_id,
        actor_email: user.email,
        action: 'document_deleted',
        entity_type: 'document',
        entity_id: document_id,
        description: `${user.email} deleted document: ${doc.file_name || document_id}`,
      });
    } catch (_) {}

    return Response.json({ success: true, document_id });

  } catch (error) {
    console.error(`[deleteDocument] Error:`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});