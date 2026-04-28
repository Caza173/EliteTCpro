/**
 * deleteUserAccount — Secure full data cleanup and account deletion.
 * Deletes all owned data then removes the user from the auth system.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const userEmail = user.email;

    console.log(`[deleteUserAccount] Starting deletion for user: ${userEmail} (${userId})`);

    // 1. Find all transactions owned by this user
    const [createdTx, assignedTx] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ created_by: userId }),
      base44.asServiceRole.entities.Transaction.filter({ assigned_tc_id: userId }),
    ]);

    const txMap = new Map();
    [...createdTx, ...assignedTx].forEach(tx => txMap.set(tx.id, tx));
    const allTxIds = [...txMap.keys()];

    console.log(`[deleteUserAccount] Found ${allTxIds.length} transactions to clean up`);

    // 2. Delete all related sub-records for each transaction
    for (const txId of allTxIds) {
      // Delete in parallel per transaction
      await Promise.allSettled([
        // Documents
        base44.asServiceRole.entities.Document.filter({ transaction_id: txId })
          .then(docs => Promise.all(docs.map(d => base44.asServiceRole.entities.Document.delete(d.id)))),
        // Notes
        base44.asServiceRole.entities.Note?.filter({ transaction_id: txId })
          .then(items => Promise.all((items || []).map(i => base44.asServiceRole.entities.Note.delete(i.id)))),
        // AIActivityLog
        base44.asServiceRole.entities.AIActivityLog.filter({ transaction_id: txId })
          .then(items => Promise.all(items.map(i => base44.asServiceRole.entities.AIActivityLog.delete(i.id)))),
        // TransactionTask
        base44.asServiceRole.entities.TransactionTask?.filter({ transaction_id: txId })
          .then(items => Promise.all((items || []).map(i => base44.asServiceRole.entities.TransactionTask.delete(i.id)))),
        // InAppNotification
        base44.asServiceRole.entities.InAppNotification.filter({ transaction_id: txId })
          .then(items => Promise.all(items.map(i => base44.asServiceRole.entities.InAppNotification.delete(i.id)))),
        // DocumentChecklistItem
        base44.asServiceRole.entities.DocumentChecklistItem.filter({ transaction_id: txId })
          .then(items => Promise.all(items.map(i => base44.asServiceRole.entities.DocumentChecklistItem.delete(i.id)))),
        // AuditLog
        base44.asServiceRole.entities.AuditLog.filter({ transaction_id: txId })
          .then(items => Promise.all(items.map(i => base44.asServiceRole.entities.AuditLog.delete(i.id)))),
        // TransactionFinance
        base44.asServiceRole.entities.TransactionFinance?.filter({ transaction_id: txId })
          .then(items => Promise.all((items || []).map(i => base44.asServiceRole.entities.TransactionFinance.delete(i.id)))),
      ]);

      // Delete the transaction itself
      await base44.asServiceRole.entities.Transaction.delete(txId);
    }

    console.log(`[deleteUserAccount] Transactions and related data deleted`);

    // 3. Delete user-level notifications (not tied to a specific transaction)
    const userNotifs = await base44.asServiceRole.entities.InAppNotification.filter({ user_email: userEmail });
    await Promise.all(userNotifs.map(n => base44.asServiceRole.entities.InAppNotification.delete(n.id)));

    // 4. Log the deletion event before removing the user
    await base44.asServiceRole.entities.AuditLog.create({
      actor_email: userEmail,
      action: 'account_deleted',
      entity_type: 'user',
      entity_id: userId,
      description: `User ${userEmail} deleted their own account. ${allTxIds.length} transactions cleaned up.`,
    });

    // 5. Delete the user from auth
    await base44.asServiceRole.auth.deleteUser(userId);

    console.log(`[deleteUserAccount] User ${userEmail} fully deleted`);
    return Response.json({ ok: true, deleted_transactions: allTxIds.length });

  } catch (error) {
    console.error('[deleteUserAccount] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});