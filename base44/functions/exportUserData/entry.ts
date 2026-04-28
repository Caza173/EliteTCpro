/**
 * exportUserData — Generates a JSON export of all data owned by the current user.
 * Returns a signed download URL for a temporary file.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const userEmail = user.email;

    console.log(`[exportUserData] Exporting data for: ${userEmail}`);

    const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';
    const isSuper = userEmail === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';

    let transactions;
    if (isSuper) {
      // Admins/owners get all transactions
      transactions = await base44.asServiceRole.entities.Transaction.list('-created_date', 500);
    } else {
      // Regular users get only their owned/assigned transactions
      const [createdTx, assignedTx] = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter({ created_by: userId }),
        base44.asServiceRole.entities.Transaction.filter({ assigned_tc_id: userId }),
      ]);
      const txMap = new Map();
      [...createdTx, ...assignedTx].forEach(tx => txMap.set(tx.id, tx));
      transactions = [...txMap.values()];
    }

    const allTxIds = transactions.map(tx => tx.id);

    // Fetch sub-records for all transactions
    const [tasks, notes, aiLogs, auditLogs, notifications, documents] = await Promise.all([
      // TransactionTask
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.TransactionTask?.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
      // Notes
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Note?.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
      // AIActivityLog
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.AIActivityLog.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
      // AuditLog
      base44.asServiceRole.entities.AuditLog.filter({ actor_email: userEmail }).catch(() => []),
      // InAppNotification
      base44.asServiceRole.entities.InAppNotification.filter({ user_email: userEmail }).catch(() => []),
      // Documents
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Document.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
    ]);

    // Build export package
    const exportData = {
      exported_at: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_date: user.created_date,
      },
      transactions,
      tasks,
      notes,
      ai_activity_log: aiLogs,
      audit_log: auditLogs,
      notifications,
      documents: documents.map(d => ({
        id: d.id,
        transaction_id: d.transaction_id,
        file_name: d.file_name,
        doc_type: d.doc_type,
        file_url: d.file_url,
        uploaded_by: d.uploaded_by,
        created_date: d.created_date,
      })),
    };

    // Upload as a private file
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `user-data-export-${timestamp}.json`;
    const file = new File([jsonBlob], fileName, { type: 'application/json' });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 86400, // 24 hours
    });

    console.log(`[exportUserData] Export ready for ${userEmail}: ${allTxIds.length} transactions`);

    return Response.json({
      ok: true,
      download_url: signed_url,
      stats: {
        transactions: transactions.length,
        tasks: tasks.length,
        documents: documents.length,
        notes: notes.length,
      },
      expires_in_hours: 24,
    });

  } catch (error) {
    console.error('[exportUserData] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});