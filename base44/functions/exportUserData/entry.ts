/**
 * exportUserData — Generates an Excel (.xlsx) export of all data owned by the current user.
 * Returns a signed download URL for a temporary file.
 * Each user may only export their own data. Admins/owners are included but still scoped to their own records.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    console.log(`[exportUserData] Exporting data for user ID: ${userId}`);

    // Always export only the authenticated user's own data — no global listing
    const [createdTx, assignedTx] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ owner_user_id: userId }),
      base44.asServiceRole.entities.Transaction.filter({ assigned_tc_id: userId }),
    ]);
    const txMap = new Map();
    [...createdTx, ...assignedTx].forEach(tx => txMap.set(tx.id, tx));
    const transactions = [...txMap.values()];

    const allTxIds = transactions.map(tx => tx.id);

    // Fetch sub-records scoped to owned transactions
    const [tasks, notes, auditLogs, documents] = await Promise.all([
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.TransactionTask.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : Promise.resolve([]),
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Note.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : Promise.resolve([]),
      base44.asServiceRole.entities.AuditLog.filter({ actor_user_id: userId }).catch(() => []),
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Document.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : Promise.resolve([]),
    ]);

    // Build workbook
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Transactions ──────────────────────────────────────────────
    const txRows = transactions.map(tx => ({
      'Address':          tx.address || '',
      'Agent':            tx.agent || '',
      'Agent Email':      tx.agent_email || '',
      'Status':           tx.status || '',
      'Phase':            tx.transaction_phase || '',
      'Transaction Type': tx.transaction_type || '',
      'Sale Price':       tx.sale_price || '',
      'Commission %':     tx.commission_percent || '',
      'Buyer':            tx.buyers?.[0] || tx.buyer || '',
      'Seller':           tx.sellers?.[0] || tx.seller || '',
      'Contract Date':    tx.contract_date || '',
      'Closing Date':     tx.closing_date || '',
      'Inspection Deadline': tx.inspection_deadline || '',
      'Financing Deadline':  tx.financing_deadline || '',
      'Appraisal Deadline':  tx.appraisal_deadline || '',
      'MLS Number':       tx.mls_number || '',
      'Title Company':    tx.closing_title_company || '',
      'Lender':           tx.lender_name || '',
      'Lender Email':     tx.lender_email || '',
      'Inspector':        tx.inspector_name || '',
      'Created Date':     tx.created_date || '',
    }));
    const txSheet = XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ 'No Data': 'No transactions found' }]);
    XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

    // ── Sheet 2: Tasks ────────────────────────────────────────────────────
    const taskRows = tasks.map(t => ({
      'Transaction ID': t.transaction_id || '',
      'Task Name':      t.title || t.name || '',
      'Status':         t.is_completed ? 'complete' : 'pending',
      'Assigned To':    t.assigned_to_name || t.assigned_to_email || '',
      'Due Date':       t.due_date || '',
      'Phase':          t.phase || '',
      'Required':       t.is_required ? 'Yes' : 'No',
      'Created Date':   t.created_date || '',
    }));
    const taskSheet = XLSX.utils.json_to_sheet(taskRows.length ? taskRows : [{ 'No Data': 'No tasks found' }]);
    XLSX.utils.book_append_sheet(wb, taskSheet, 'Tasks');

    // ── Sheet 3: Documents ────────────────────────────────────────────────
    const docRows = documents.map(d => ({
      'Transaction ID': d.transaction_id || '',
      'File Name':      d.file_name || '',
      'Document Type':  d.doc_type || '',
      'Uploaded By':    d.uploaded_by || '',
      'File URL':       d.file_url || '',
      'Created Date':   d.created_date || '',
    }));
    const docSheet = XLSX.utils.json_to_sheet(docRows.length ? docRows : [{ 'No Data': 'No documents found' }]);
    XLSX.utils.book_append_sheet(wb, docSheet, 'Documents');

    // ── Sheet 4: Notes ────────────────────────────────────────────────────
    const noteRows = notes.map(n => ({
      'Transaction ID': n.transaction_id || '',
      'Note':           n.message || n.content || '',
      'Author':         n.created_by_name || n.created_by || '',
      'Created Date':   n.created_date || '',
    }));
    const noteSheet = XLSX.utils.json_to_sheet(noteRows.length ? noteRows : [{ 'No Data': 'No notes found' }]);
    XLSX.utils.book_append_sheet(wb, noteSheet, 'Notes');

    // ── Sheet 5: Audit Log ────────────────────────────────────────────────
    const auditRows = auditLogs.map(a => ({
      'Action':        a.action || '',
      'Entity Type':   a.entity_type || '',
      'Description':   a.description || '',
      'Transaction ID':a.transaction_id || '',
      'Created Date':  a.created_date || '',
    }));
    const auditSheet = XLSX.utils.json_to_sheet(auditRows.length ? auditRows : [{ 'No Data': 'No audit log entries' }]);
    XLSX.utils.book_append_sheet(wb, auditSheet, 'Audit Log');

    // ── Sheet 6: Profile ──────────────────────────────────────────────────
    const profileSheet = XLSX.utils.json_to_sheet([{
      'Full Name':    user.full_name || '',
      'Email':        user.email || '',
      'Role':         user.role || '',
      'Member Since': user.created_date || '',
      'Exported At':  new Date().toISOString(),
    }]);
    XLSX.utils.book_append_sheet(wb, profileSheet, 'Profile');

    // Write workbook to buffer
    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const uint8 = new Uint8Array(xlsxBuffer);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `elitetc-export-${timestamp}.xlsx`;
    const file = new File([uint8], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 86400,
    });

    console.log(`[exportUserData] Export ready for user ${userId}: ${transactions.length} transactions`);

    return Response.json({
      ok: true,
      download_url: signed_url,
      file_name: fileName,
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