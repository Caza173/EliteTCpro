import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    // Fetch ALL documents for this transaction (no filter)
    const all = await base44.asServiceRole.entities.Document.filter({ transaction_id });
    console.log(`[cleanup] Found ${all.length} total documents`);

    // Group by file_name, keep the newest, delete the rest
    const grouped = {};
    for (const doc of all) {
      if (!grouped[doc.file_name]) grouped[doc.file_name] = [];
      grouped[doc.file_name].push(doc);
    }

    const toDelete = [];
    for (const [name, docs] of Object.entries(grouped)) {
      const sorted = docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const dupes = sorted.slice(1); // keep index 0 (newest), delete rest
      toDelete.push(...dupes);
      console.log(`[cleanup] "${name}": keeping 1, deleting ${dupes.length}`);
    }

    let deleted = 0;
    let failed = 0;
    for (const doc of toDelete) {
      try {
        await base44.asServiceRole.entities.Document.delete(doc.id);
        deleted++;
      } catch (e) {
        console.log(`[cleanup] Failed to delete ${doc.id}: ${e.message}`);
        failed++;
      }
    }

    console.log(`[cleanup] Done: ${deleted} deleted, ${failed} failed`);
    return Response.json({ success: true, total: all.length, deleted, failed, kept: all.length - deleted });

  } catch (error) {
    console.error('[cleanup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});