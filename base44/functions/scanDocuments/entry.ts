import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, action } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    // ── ACTION: status ─────────────────────────────────────────────────────
    if (action === 'status') {
      const jobs = await base44.asServiceRole.entities.ScanJob.filter(
        { transaction_id },
        '-created_date',
        1
      );
      const job = jobs[0] || null;
      if (!job) return Response.json({ status: 'none' });

      const reports = await base44.asServiceRole.entities.ComplianceReport.filter({ transaction_id });
      return Response.json({
        status: job.status,
        processed_docs: job.processed_docs || 0,
        total_docs: job.total_docs || 0,
        error_message: job.error_message || null,
        completed_at: job.completed_at || null,
        reports_count: reports.length,
      });
    }

    // ── ACTION: start ──────────────────────────────────────────────────────
    // Fetch documents for this transaction
    const documents = await base44.asServiceRole.entities.Document.filter({
      transaction_id,
      is_deleted: false,
    });

    const activeDocs = documents.filter(d => d.file_url);
    if (activeDocs.length === 0) {
      return Response.json({ error: 'No documents found for this transaction' }, { status: 400 });
    }

    // Fetch transaction data
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Cancel any existing pending/in_progress jobs
    const existingJobs = await base44.asServiceRole.entities.ScanJob.filter({ transaction_id });
    for (const j of existingJobs) {
      if (j.status === 'pending' || j.status === 'in_progress') {
        await base44.asServiceRole.entities.ScanJob.update(j.id, { status: 'error', error_message: 'Superseded by new scan' });
      }
    }

    // Create new job record
    const job = await base44.asServiceRole.entities.ScanJob.create({
      transaction_id,
      brokerage_id: tx.brokerage_id,
      triggered_by: user.email,
      status: 'in_progress',
      total_docs: activeDocs.length,
      processed_docs: 0,
      started_at: new Date().toISOString(),
    });

    // Run scans synchronously (Deno function keeps connection alive)
    let processed = 0;
    let anyError = null;

    const transactionData = {
      address: tx.address,
      transaction_type: tx.transaction_type,
      is_cash_transaction: tx.is_cash_transaction,
      sale_price: tx.sale_price,
      agent_email: tx.agent_email,
      phase: tx.phase,
      inspection_deadline: tx.inspection_deadline,
      appraisal_deadline: tx.appraisal_deadline,
      financing_deadline: tx.financing_deadline,
      earnest_money_deadline: tx.earnest_money_deadline,
      due_diligence_deadline: tx.due_diligence_deadline,
      closing_date: tx.closing_date,
      ctc_target: tx.ctc_target,
    };

    for (const doc of activeDocs) {
      try {
        await base44.asServiceRole.functions.invoke('complianceEngine', {
          document_url: doc.file_url,
          file_name: doc.file_name || 'Document',
          document_id: doc.id,
          transaction_id,
          brokerage_id: tx.brokerage_id,
          transaction_data: transactionData,
        });
        processed++;
        await base44.asServiceRole.entities.ScanJob.update(job.id, { processed_docs: processed });
      } catch (docErr) {
        console.error(`[scanDocuments] Failed scanning doc ${doc.id}:`, docErr.message);
        anyError = docErr.message;
        processed++;
        await base44.asServiceRole.entities.ScanJob.update(job.id, { processed_docs: processed });
      }
    }

    // Mark job complete
    await base44.asServiceRole.entities.ScanJob.update(job.id, {
      status: anyError && processed === 0 ? 'error' : 'complete',
      processed_docs: processed,
      completed_at: new Date().toISOString(),
      error_message: anyError || null,
    });

    // Trigger in-app notification for the user who started the scan
    const allReports = await base44.asServiceRole.entities.ComplianceReport.filter({ transaction_id });
    const totalIssues = allReports.reduce((s, r) => s + (r.all_issues?.length || 0), 0);
    const blockerCount = allReports.reduce((s, r) => s + (r.blockers?.length || 0), 0);

    await base44.asServiceRole.entities.InAppNotification.create({
      brokerage_id: tx.brokerage_id,
      transaction_id,
      user_email: user.email,
      title: `Compliance scan complete — ${tx.address}`,
      body: `${processed} document${processed !== 1 ? 's' : ''} scanned. ${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found${blockerCount > 0 ? ` (${blockerCount} critical)` : ''}.`,
      type: 'document',
      severity: blockerCount > 0 ? 'critical' : totalIssues > 0 ? 'warning' : 'notice',
      dismissed: false,
    });

    return Response.json({
      success: true,
      job_id: job.id,
      processed_docs: processed,
      total_docs: activeDocs.length,
      status: 'complete',
    });

  } catch (error) {
    console.error('[scanDocuments]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});