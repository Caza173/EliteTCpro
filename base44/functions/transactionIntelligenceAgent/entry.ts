import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function addDays(isoDate, days) {
  if (!isoDate || days == null) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

function isPSAgreement(doc) {
  const name = (doc.file_name || '').toLowerCase();
  const type = doc.doc_type || '';
  return type === 'contract' ||
    name.includes('p&s') ||
    name.includes('purchase') ||
    name.includes('sales agreement') ||
    name.includes('psa');
}

async function handleTransactionCreated(base44, tx) {
  if (!tx) return;
  console.log(`[TIA] New transaction created: ${tx.address}`);

  await base44.asServiceRole.entities.AuditLog.create({
    brokerage_id: tx.brokerage_id,
    transaction_id: tx.id,
    actor_email: 'system@elitetc.ai',
    action: 'transaction_created',
    entity_type: 'transaction',
    entity_id: tx.id,
    after: { address: tx.address, type: tx.transaction_type, status: tx.status },
    description: `New ${tx.transaction_type || 'buyer'} transaction created for ${tx.address}.`,
  });

  const notifyEmail = tx.agent_email || tx.created_by;
  if (notifyEmail && tx.brokerage_id) {
    try {
      await base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: tx.brokerage_id,
        transaction_id: tx.id,
        user_email: notifyEmail,
        title: `Transaction Started: ${tx.address}`,
        body: `New ${tx.transaction_type || 'buyer'} transaction created for ${tx.address}. Upload the P&S Agreement to auto-populate all deadlines and key fields.`,
        type: 'system',
      });
    } catch (err) {
      console.warn('[TIA] Could not create onboarding notification:', err.message);
    }
  }
}

async function handleDocumentUploaded(base44, doc, docId) {
  const { transaction_id, file_url, file_name, doc_type, brokerage_id } = doc;
  if (!transaction_id || !file_url) return;

  const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
  const tx = txList[0];
  if (!tx) return;

  console.log(`[TIA] Document uploaded: "${file_name}" (${doc_type}) for TX: ${tx.address}`);
  const brokerageId = brokerage_id || tx.brokerage_id;
  const notifyEmail = tx.agent_email || tx.created_by;

  // ─── P&S Auto-Parse ───────────────────────────────────────────────────────
  if (isPSAgreement(doc)) {
    console.log('[TIA] P&S detected — running auto-parse...');
    try {
      const extraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: "New Hampshire NHAR Purchase & Sales Agreement extraction.",
          properties: {
            buyer_names:               { type: "string", description: "Buyer name(s) — appears AFTER 'and' keyword in Section 1" },
            seller_names:              { type: "string", description: "Seller name(s) — appears BEFORE 'and' keyword in Section 1" },
            acceptance_date:           { type: "string", description: "Effective/acceptance date YYYY-MM-DD" },
            property_address:          { type: "string", description: "Full property address from Section 2" },
            purchase_price:            { type: "number", description: "SELLING PRICE — scan up to 3 lines after label. Return plain number, no $ or commas." },
            deposit_amount:            { type: "number", description: "Earnest money deposit — scan up to 3 lines after phrase. Return plain number." },
            earnest_money_days:        { type: "number", description: "Days from acceptance date to deliver deposit" },
            closing_date:              { type: "string", description: "Transfer of Title date YYYY-MM-DD" },
            title_company:             { type: "string", description: "Closing/title company name" },
            buyer_agent:               { type: "string", description: "Buyer agent name from Section 7" },
            seller_agent:              { type: "string", description: "Seller/listing agent name from Section 7" },
            buyer_brokerage:           { type: "string", description: "Buyer agent brokerage/firm" },
            seller_brokerage:          { type: "string", description: "Seller agent brokerage/firm" },
            inspection_days:           { type: "number", description: "General inspection days from Section 15" },
            due_diligence_days:        { type: "number", description: "Due diligence days from Section 16" },
            financing_commitment_date: { type: "string", description: "Financing commitment deadline YYYY-MM-DD from Section 19" },
            commission_percent:        { type: "number", description: "Commission % from Section 20" },
            seller_concession_amount:  { type: "number", description: "Seller concession dollar amount" },
            professional_fee_percent:  { type: "number", description: "Professional fee %" },
            professional_fee_amount:   { type: "number", description: "Professional fee dollar amount" },
          }
        }
      });

      if (extraction.status !== 'error' && extraction.output) {
        const r = extraction.output;
        const acceptanceDate = r.acceptance_date || null;
        const updates = {};

        if (r.buyer_names) updates.buyer = r.buyer_names;
        if (r.seller_names) updates.seller = r.seller_names;
        if (r.property_address && !tx.address) updates.address = r.property_address;
        if (r.purchase_price) updates.sale_price = r.purchase_price;
        if (r.closing_date) updates.closing_date = r.closing_date;
        if (r.title_company) updates.closing_title_company = r.title_company;
        if (r.buyer_agent) updates.buyers_agent_name = r.buyer_agent;
        if (r.seller_agent) updates.sellers_agent_name = r.seller_agent;
        if (r.buyer_brokerage) updates.buyer_brokerage = r.buyer_brokerage;
        if (r.seller_brokerage) updates.seller_brokerage = r.seller_brokerage;
        if (r.commission_percent) updates.commission_percent = r.commission_percent;
        if (r.financing_commitment_date) updates.financing_deadline = r.financing_commitment_date;
        if (acceptanceDate) updates.contract_date = acceptanceDate;

        const inspDeadline = addDays(acceptanceDate, r.inspection_days);
        const ddDeadline   = addDays(acceptanceDate, r.due_diligence_days);
        const emDeadline   = addDays(acceptanceDate, r.earnest_money_days);
        if (inspDeadline) updates.inspection_deadline = inspDeadline;
        if (ddDeadline)   updates.due_diligence_deadline = ddDeadline;
        if (emDeadline)   updates.earnest_money_deadline = emDeadline;

        await base44.asServiceRole.entities.Transaction.update(tx.id, updates);
        console.log('[TIA] Transaction updated from P&S:', Object.keys(updates));

        await base44.asServiceRole.entities.AuditLog.create({
          brokerage_id: brokerageId,
          transaction_id: tx.id,
          actor_email: 'system@elitetc.ai',
          action: 'ps_auto_parsed',
          entity_type: 'document',
          entity_id: docId,
          after: updates,
          description: `P&S auto-parsed by Transaction Intelligence Agent. Updated: ${Object.keys(updates).join(', ')}.`,
        });

        if (notifyEmail && brokerageId) {
          try {
            await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: brokerageId,
              transaction_id: tx.id,
              user_email: notifyEmail,
              title: `✅ P&S Auto-Parsed: ${tx.address}`,
              body: `Key data extracted automatically — Buyer: ${r.buyer_names || '—'}, Seller: ${r.seller_names || '—'}, Closing: ${r.closing_date || '—'}, Price: ${r.purchase_price ? '$' + r.purchase_price.toLocaleString() : '—'}. Please review.`,
              type: 'document',
            });
          } catch (err) {
            console.warn('[TIA] Could not create P&S notification:', err.message);
          }
        }
      }
    } catch (err) {
      console.error('[TIA] P&S parse error:', err.message);
    }
  }

  // ─── Compliance Check (all documents) ────────────────────────────────────
  try {
    console.log('[TIA] Running compliance check...');
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real estate compliance engine for a New Hampshire Transaction Coordinator platform.
Analyze this document and return a structured compliance report.

Transaction: ${tx.address || 'Unknown'}
Transaction Type: ${tx.transaction_type || 'buyer'}
Is Cash Transaction: ${tx.is_cash_transaction ? 'Yes' : 'No'}
Document file name: ${file_name}

Perform:
1. Classify document type (P&S, Disclosure, Inspection Report, Appraisal, Addendum, etc.)
2. Detect signatures — for each party (buyer, seller, buyer agent, seller agent): "present", "missing", or "not_found"
3. List important blank fields
4. Generate compliance issues with severity: "blocker" (missing required sig/price), "warning" (blank deadline), "info" (advisory)
5. List typical companion documents that should accompany this document type
6. Score 0-100 (start 100, -20 per blocker, -7 per warning, -5 per blank critical field)
7. One-sentence summary

Return JSON only.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type:           { type: "string" },
          compliance_score:        { type: "number" },
          issues:                  { type: "array", items: { type: "object" } },
          blank_fields:            { type: "array", items: { type: "string" } },
          signatures:              { type: "object" },
          summary:                 { type: "string" },
          missing_companion_docs:  { type: "array", items: { type: "string" } }
        }
      }
    });

    const issues   = result.issues || [];
    const blockers = issues.filter(i => i.severity === 'blocker');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infoItems = issues.filter(i => i.severity === 'info');
    const status   = blockers.length > 0 ? 'blockers' : warnings.length > 0 ? 'warnings' : 'compliant';

    // Remove prior report for this document
    const existing = await base44.asServiceRole.entities.ComplianceReport.filter({ document_id: docId });
    for (const r of existing) {
      try { await base44.asServiceRole.entities.ComplianceReport.delete(r.id); } catch(_) {}
    }

    await base44.asServiceRole.entities.ComplianceReport.create({
      transaction_id: tx.id,
      brokerage_id: brokerageId,
      document_id: docId,
      document_name: file_name || 'Document',
      document_type: result.document_type || 'Other',
      compliance_score: Math.max(10, Math.min(100, result.compliance_score || 100)),
      status,
      blockers,
      warnings,
      info_items: infoItems,
      all_issues: issues,
      extracted_fields: {},
      signatures: result.signatures || {},
      blank_fields: result.blank_fields || [],
      missing_docs: result.missing_companion_docs || [],
      summary: result.summary || ''
    });

    if (status !== 'compliant' && notifyEmail && brokerageId) {
      try {
        await base44.asServiceRole.entities.InAppNotification.create({
          brokerage_id: brokerageId,
          transaction_id: tx.id,
          user_email: notifyEmail,
          title: `${status === 'blockers' ? '🚨 Compliance Blocker' : '⚠️ Compliance Warning'}: ${file_name}`,
          body: result.summary || `Compliance check found ${status} for "${file_name}".`,
          type: 'document',
        });
      } catch (err) {
        console.warn('[TIA] Could not create compliance notification:', err.message);
      }
    }

    console.log(`[TIA] Compliance: ${status}, score: ${result.compliance_score}`);
  } catch (err) {
    console.error('[TIA] Compliance check error:', err.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    if (!event) return Response.json({ error: 'No event in payload' }, { status: 400 });

    let entityData = data;

    // If payload too large, refetch from DB
    if (payload_too_large && event.entity_id && event.entity_name) {
      const rows = await base44.asServiceRole.entities[event.entity_name].filter({ id: event.entity_id });
      entityData = rows[0] || null;
    }

    console.log(`[TIA] Event: ${event.type} on ${event.entity_name} id=${event.entity_id}`);

    if (event.entity_name === 'Transaction' && event.type === 'create') {
      await handleTransactionCreated(base44, { ...entityData, id: event.entity_id });
    } else if (event.entity_name === 'Document' && event.type === 'create') {
      await handleDocumentUploaded(base44, entityData, event.entity_id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[TIA] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});