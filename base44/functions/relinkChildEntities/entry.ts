/**
 * relinkChildEntities
 * 
 * Re-links all child entities (TransactionTask, Document, Note, AuditLog, 
 * Contingency, ComplianceReport, ComplianceIssue, CalendarEventMap, Appointment)
 * from original (deleted) transaction IDs to the new reconstructed transaction IDs.
 * 
 * Admin only. Safe — only updates transaction_id references.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin']);

// Mapping: original_id → address keyword to match against new records
const OLD_TO_ADDRESS = {
  '69c4b518bbb008eedc5f44d4': '10 Hemlock St',
  '69e8fa31a0a5ee100055d888': 'Jonah Deal',
  '69b0bb3f290fda6a127e3e81': '66 Brookside Ln',
  '69cb26f385485abca4e83c5d': 'Buyer Deal (Mar 2026)',
  '69dd7baa405037fc246c3267': 'Buyer Deal (Apr 2026)',
  '69c1f1411338ab480534e3ae': 'Listing Deal',
  '69de4f0684d05a8708af6e73': '5 Bill Street',
  '69e42941e429d6b000c0b505': 'AmyCaza Collaborator',
  '6a021286a84fae7917423f71': 'Active Deal (May 2026 A)',
  '6a0dc77e42849d12cf57b88c': 'Active Deal (May 20',
  '6a0e85cb7b1bb69fcf568f91': 'Active Deal (May 21',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (!ADMIN_ROLES.has(user.role) && !ADMIN_ROLES.has(user.data?.role))) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const svc = base44.asServiceRole;

    // Load all current transactions to build old→new ID map
    const allTx = await svc.entities.Transaction.list('-created_date', 200);
    console.log(`[relink] found ${allTx.length} transactions`);

    // Build mapping: original_id → new_id by matching address keywords
    const oldToNew = {};
    for (const [oldId, addressKeyword] of Object.entries(OLD_TO_ADDRESS)) {
      const match = allTx.find(t => t.address && t.address.includes(addressKeyword.split(' (')[0]));
      if (match) {
        oldToNew[oldId] = match.id;
        console.log(`[relink] mapped ${oldId} → ${match.id} (${match.address})`);
      } else {
        console.warn(`[relink] no match found for ${oldId} (keyword: ${addressKeyword})`);
      }
    }

    console.log(`[relink] ID mappings built: ${Object.keys(oldToNew).length}`);

    const CHILD_ENTITIES = [
      'TransactionTask', 'Document', 'Note', 'AuditLog',
      'Contingency', 'ComplianceReport', 'ComplianceIssue',
      'CalendarEventMap', 'Appointment', 'DocumentChecklistItem',
      'TransactionFinance', 'SignatureRequest', 'TransactionCollaborator',
      'DealCollaborator', 'TransactionParticipant', 'TransactionContact',
    ];

    const results = {};

    for (const entityName of CHILD_ENTITIES) {
      let updated = 0;
      let skipped = 0;
      try {
        const records = await svc.entities[entityName].list('-created_date', 2000);
        for (const rec of records) {
          const txField = rec.transaction_id;
          if (!txField) { skipped++; continue; }
          const newId = oldToNew[txField];
          if (!newId) { skipped++; continue; }
          if (newId === txField) { skipped++; continue; } // already correct

          await svc.entities[entityName].update(rec.id, { transaction_id: newId });
          updated++;
        }
        results[entityName] = { updated, skipped };
        console.log(`[relink] ${entityName}: updated=${updated} skipped=${skipped}`);
      } catch (e) {
        results[entityName] = { error: e.message };
        console.warn(`[relink] ${entityName} failed: ${e.message}`);
      }
    }

    return Response.json({
      ok: true,
      id_map: oldToNew,
      child_entity_results: results,
    });

  } catch (error) {
    console.error('[relink] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});