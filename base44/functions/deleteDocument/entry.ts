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

    // Step 1: Find the document
    let doc = null;
    try {
      const results = await base44.asServiceRole.entities.Document.filter({ id: document_id });
      doc = results[0] || null;
    } catch (_) {}

    // Step 2: Not found → idempotent success
    if (!doc) {
      console.log(`[deleteDocument] Not found — idempotent success: ${document_id}`);
      return Response.json({ success: true, already_deleted: true, document_id });
    }

    // Step 3: Hard delete from DB
    try {
      await base44.asServiceRole.entities.Document.delete(document_id);
      console.log(`[deleteDocument] Hard deleted: ${document_id}`);
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (!msg.includes('404') && !msg.includes('not found')) {
        console.log(`[deleteDocument] Delete failed: ${e.message}`);
        return Response.json({ error: `Delete failed: ${e.message}` }, { status: 500 });
      }
      console.log(`[deleteDocument] Already gone (404): ${document_id}`);
    }

    // Step 4: Soft-delete marker — create a tombstone record so re-creation is blocked
    try {
      await base44.asServiceRole.entities.Document.create({
        id: document_id, // same ID as tombstone
        transaction_id: doc.transaction_id || transaction_id,
        brokerage_id: doc.brokerage_id,
        file_url: doc.file_url || 'deleted',
        file_name: doc.file_name,
        doc_type: doc.doc_type || 'other',
        uploaded_by: doc.uploaded_by,
        uploaded_by_role: doc.uploaded_by_role,
        is_deleted: true,
        notes: `Deleted by ${user.email} on ${new Date().toISOString()}`,
      });
      console.log(`[deleteDocument] Tombstone created for: ${document_id}`);
    } catch (_) {
      // tombstone creation is best-effort
    }

    // Step 5: Audit log
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
    console.log(`[deleteDocument] Unexpected error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});