/**
 * exportUserData — Generates an Excel (.xlsx) export of all data owned by the current user.
 * Returns a signed download URL for a temporary file.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

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
      transactions = await base44.entities.Transaction.list('-created_date', 500);
    } else {
      const [createdTx, assignedTx] = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter({ created_by: userId }),
        base44.asServiceRole.entities.Transaction.filter({ assigned_tc_id: userId }),
      ]);
      const txMap = new Map();
      [...createdTx, ...assignedTx].forEach(tx => txMap.set(tx.id, tx));
      transactions = [...txMap.values()];
    }

    const allTxIds = transactions.map(tx => tx.id);

    // Fetch sub-records
    const [tasks, notes, auditLogs, documents] = await Promise.all([
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.TransactionTask?.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Note?.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
      base44.asServiceRole.entities.AuditLog.filter({ actor_email: userEmail }).catch(() => []),
      allTxIds.length > 0
        ? Promise.all(allTxIds.map(id => base44.asServiceRole.entities.Document.filter({ transaction_id: id }).catch(() => [])))
            .then(r => r.flat())
        : [],
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
      'Task Name':      t.task_name || t.name || t.title || '',
      'Status':         t.status || (t.completed ? 'complete' : 'pending'),
      'Assigned To':    t.assigned_to || t.assignee || '',
      'Due Date':       t.due_date || '',
      'Phase':          t.phase_number || t.phase || '',
      'Required':       t.required ? 'Yes' : 'No',
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
      'Note':           n.content || n.body || n.text || '',
      'Author':         n.author || n.created_by || '',
      'Created Date':   n.created_date || '',
    }));
    const noteSheet = XLSX.utils.json_to_sheet(noteRows.length ? noteRows : [{ 'No Data': 'No notes found' }]);
    XLSX.utils.book_append_sheet(wb, noteSheet, 'Notes');

    // ── Sheet 5: Audit Log ────────────────────────────────────────────────
    const auditRows = auditLogs.map(a => ({
      'Action':        a.action || '',
      'Entity Type':   a.entity_type || '',
      'Description':   a.description || '',
      'Actor Email':   a.actor_email || '',
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

    console.log(`[exportUserData] Excel export ready for ${userEmail}: ${transactions.length} transactions`);

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