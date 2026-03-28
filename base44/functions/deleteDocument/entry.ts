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

    console.log(`[deleteDocument] START delete request: document_id=${document_id} by user=${user.email}`);

    // Step 1: Attempt delete via service role (bypasses RLS)
    let deleteResult = 'unknown';
    try {
      await base44.asServiceRole.entities.Document.delete(document_id);
      deleteResult = 'success';
      console.log(`[deleteDocument] Service role delete: SUCCESS for ${document_id}`);
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('404') || msg.includes('not found')) {
        deleteResult = 'not_found';
        console.log(`[deleteDocument] Service role delete: 404 NOT FOUND for ${document_id} — trying user-scoped delete`);

        // Fallback: try user-scoped delete (covers RLS-scoped records)
        try {
          await base44.entities.Document.delete(document_id);
          deleteResult = 'success_user_scoped';
          console.log(`[deleteDocument] User-scoped delete: SUCCESS for ${document_id}`);
        } catch (e2) {
          const msg2 = String(e2?.message || '').toLowerCase();
          if (msg2.includes('404') || msg2.includes('not found')) {
            deleteResult = 'already_deleted';
            console.log(`[deleteDocument] User-scoped delete: 404 — document already gone: ${document_id}`);
          } else {
            console.log(`[deleteDocument] User-scoped delete FAILED: ${e2.message}`);
            return Response.json({ error: `Delete failed: ${e2.message}` }, { status: 500 });
          }
        }
      } else {
        console.log(`[deleteDocument] Service role delete FAILED (non-404): ${e.message}`);
        return Response.json({ error: `Delete failed: ${e.message}` }, { status: 500 });
      }
    }

    // Step 2: Post-delete verification — try to fetch the record; if it throws 404, it's gone
    let postFetchResult = 'unknown';
    try {
      await base44.asServiceRole.entities.Document.get(document_id);
      // If this succeeds, the doc still exists
      postFetchResult = 'still_exists';
      console.log(`[deleteDocument] POST-DELETE CHECK: Document ${document_id} STILL EXISTS after delete!`);
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('404') || msg.includes('not found')) {
        postFetchResult = 'confirmed_deleted';
        console.log(`[deleteDocument] POST-DELETE CHECK: Document ${document_id} confirmed DELETED (404 on fetch)`);
      } else {
        // Non-404 error on check — assume deleted but log it
        postFetchResult = 'check_error';
        console.log(`[deleteDocument] POST-DELETE CHECK error (assuming deleted): ${e.message}`);
      }
    }

    if (postFetchResult === 'still_exists') {
      return Response.json({ error: 'Document was not removed. Please contact support.' }, { status: 500 });
    }

    console.log(`[deleteDocument] DONE: document_id=${document_id}, deleteResult=${deleteResult}, postFetchResult=${postFetchResult}`);
    return Response.json({ success: true, document_id, deleteResult, postFetchResult });

  } catch (error) {
    console.log(`[deleteDocument] Unexpected error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});