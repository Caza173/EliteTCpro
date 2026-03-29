import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── NHAR Document Templates ─────────────────────────────────────────────────
// Defines required signature blocks, initials, and fields by page for each form type.
const NHAR_TEMPLATES = {
  "Purchase and Sales Agreement": {
    required_fields: [
      { field: "purchase_price", page: 1, label: "Purchase Price" },
      { field: "earnest_money", page: 1, label: "Earnest Money Amount" },
      { field: "closing_date", page: 1, label: "Closing Date" },
      { field: "property_address", page: 1, label: "Property Address" },
      { field: "buyer_name", page: 1, label: "Buyer Name" },
      { field: "seller_name", page: 1, label: "Seller Name" },
    ],
    signature_blocks: [
      { role: "buyer", page: "last", label: "Buyer Signature" },
      { role: "seller", page: "last", label: "Seller Signature" },
      { role: "buyer_agent", page: "last", label: "Buyer's Agent Signature" },
      { role: "seller_agent", page: "last", label: "Seller's Agent Signature" },
    ],
    initials_required: true, // Footer of every interior page
    initials_label: "Buyer & Seller initials required on each page footer",
    companion_docs: ["Agency Disclosure", "Property Disclosure", "Lead Paint Disclosure", "Earnest Money Receipt"],
  },
  "Agency Disclosure": {
    required_fields: [
      { field: "buyer_name", page: 1, label: "Client Name" },
      { field: "buyers_agent", page: 1, label: "Agent Name" },
    ],
    signature_blocks: [
      { role: "buyer", page: 1, label: "Client Signature" },
      { role: "buyer_agent", page: 1, label: "Agent Signature" },
    ],
    initials_required: false,
    companion_docs: [],
  },
  "Property Disclosure": {
    required_fields: [
      { field: "seller_name", page: 1, label: "Seller Name" },
      { field: "property_address", page: 1, label: "Property Address" },
    ],
    signature_blocks: [
      { role: "seller", page: "last", label: "Seller Signature" },
    ],
    initials_required: false,
    companion_docs: [],
  },
  "Lead Paint Disclosure": {
    required_fields: [
      { field: "buyer_name", page: 1, label: "Buyer Name" },
      { field: "seller_name", page: 1, label: "Seller Name" },
      { field: "property_address", page: 1, label: "Property Address" },
    ],
    signature_blocks: [
      { role: "buyer", page: 1, label: "Buyer Signature" },
      { role: "seller", page: 1, label: "Seller Signature" },
      { role: "buyer_agent", page: 1, label: "Buyer's Agent Signature" },
    ],
    initials_required: false,
    companion_docs: [],
  },
  "Addendum": {
    required_fields: [
      { field: "property_address", page: 1, label: "Property Address" },
      { field: "effective_date", page: 1, label: "Effective Date" },
    ],
    signature_blocks: [
      { role: "buyer", page: "last", label: "Buyer Signature" },
      { role: "seller", page: "last", label: "Seller Signature" },
    ],
    initials_required: false,
    companion_docs: [],
  },
  "Closing Disclosure": {
    required_fields: [
      { field: "closing_date", page: 1, label: "Closing Date" },
      { field: "purchase_price", page: 1, label: "Sale Price" },
      { field: "buyer_name", page: 1, label: "Borrower Name" },
    ],
    signature_blocks: [
      { role: "buyer", page: "last", label: "Borrower Signature" },
    ],
    initials_required: false,
    companion_docs: [],
  },
};

function getTemplate(documentType) {
  return NHAR_TEMPLATES[documentType] || null;
}

function buildTemplateContext(template, docType) {
  if (!template) return "";
  const sigList = template.signature_blocks.map(s =>
    `  - ${s.label} (${s.role}) on page ${s.page}`
  ).join("\n");
  const fieldList = template.required_fields.map(f =>
    `  - "${f.label}" on page ${f.page}`
  ).join("\n");

  return `
NHAR TEMPLATE REQUIREMENTS FOR: ${docType}
Required signature blocks:
${sigList}
Required fields:
${fieldList}
${template.initials_required ? "⚠ Buyer AND Seller initials are REQUIRED at the footer of every interior page." : ""}
`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_url, file_name, document_id, transaction_id, brokerage_id, transaction_data } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    // ─── 1. DEADLINE / FINANCIAL / MISSING-DOC CHECKS ────────────────────────
    const today = new Date();
    const deadlineIssues = [];

    if (transaction_data) {
      const deadlineFields = [
        { field: "inspection_deadline", label: "Inspection Deadline" },
        { field: "appraisal_deadline", label: "Appraisal Deadline" },
        { field: "financing_deadline", label: "Financing Commitment Deadline" },
        { field: "earnest_money_deadline", label: "Earnest Money Deadline" },
        { field: "due_diligence_deadline", label: "Due Diligence Deadline" },
        { field: "closing_date", label: "Closing Date" },
        { field: "ctc_target", label: "Clear to Close Target" },
      ];

      for (const { field, label } of deadlineFields) {
        const dateStr = transaction_data[field];
        if (!dateStr) continue;
        const dt = new Date(dateStr);
        const daysLeft = Math.ceil((dt - today) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          deadlineIssues.push({
            issue_type: "deadline", severity: "blocker",
            message: `${label} was ${Math.abs(daysLeft)} day(s) ago (${dateStr}) and may be overdue.`,
            suggested_task: `Confirm ${label} status with all parties`,
          });
        } else if (daysLeft <= 7) {
          deadlineIssues.push({
            issue_type: "deadline", severity: "warning",
            message: `${label} is approaching in ${daysLeft} day(s) (${dateStr}).`,
            suggested_task: `Follow up on ${label}`,
          });
        }
      }

      if (transaction_data.sale_price) {
        const salePrice = transaction_data.sale_price;
        const concession = transaction_data.seller_concession_amount || 0;
        const proFee = transaction_data.professional_fee_amount || 0;
        if (concession > 0 && (concession / salePrice) * 100 > 3) {
          deadlineIssues.push({
            issue_type: "financial", severity: "warning",
            message: `Seller concession of $${concession.toLocaleString()} (${((concession / salePrice) * 100).toFixed(1)}%) is unusually high. Verify with lender.`,
            suggested_task: "Confirm seller concession with lender",
          });
        }
        if (proFee > 0 && (proFee / salePrice) * 100 > 2) {
          deadlineIssues.push({
            issue_type: "financial", severity: "info",
            message: `Professional fee of $${proFee.toLocaleString()} (${((proFee / salePrice) * 100).toFixed(1)}%) — review for accuracy.`,
            suggested_task: "Review Section 20 professional fee amount",
          });
        }
      }

      if (transaction_data.checklist_items) {
        for (const item of transaction_data.checklist_items) {
          if (item.required && item.status === "missing" && item.required_by_phase <= (transaction_data.phase || 3)) {
            deadlineIssues.push({
              issue_type: "missing_document", severity: "warning",
              message: `Required document missing: ${item.label || item.doc_type}. Required by Phase ${item.required_by_phase}.`,
              suggested_task: `Upload ${item.label || item.doc_type}`,
            });
          }
        }
      }
    }

    // Persist deadline/financial issues — clear old ones first
    const oldDeadline = await base44.asServiceRole.entities.ComplianceIssue.filter({ transaction_id, source: "deadline_check" });
    const oldFinancial = await base44.asServiceRole.entities.ComplianceIssue.filter({ transaction_id, source: "financial_check" });
    for (const old of [...oldDeadline, ...oldFinancial]) {
      await base44.asServiceRole.entities.ComplianceIssue.delete(old.id);
    }
    const sourceMap = { deadline: "deadline_check", financial: "financial_check", missing_document: "deadline_check" };
    for (const issue of deadlineIssues) {
      await base44.asServiceRole.entities.ComplianceIssue.create({
        transaction_id,
        brokerage_id: brokerage_id || transaction_data?.brokerage_id,
        issue_type: issue.issue_type,
        severity: issue.severity,
        message: issue.message,
        suggested_task: issue.suggested_task,
        status: "open",
        source: sourceMap[issue.issue_type] || "deadline_check",
      });
    }

    if (!document_url) {
      return Response.json({ success: true, deadline_issues_count: deadlineIssues.length, message: "Deadline and financial checks complete" });
    }

    // ─── 2. PAGE-LEVEL AI DOCUMENT SCAN ──────────────────────────────────────
    // First pass: classify the document type
    const classifyPrompt = `You are a real estate compliance engine for New Hampshire (NHAR) transactions.

Look at this document and classify it. Return ONLY valid JSON:
{
  "document_type": "Purchase and Sales Agreement | Agency Disclosure | Property Disclosure | Lead Paint Disclosure | Addendum | Inspection Report | Appraisal | Closing Disclosure | Earnest Money Receipt | Other",
  "page_count": <integer>,
  "has_digital_signature_verification": <boolean>,
  "digital_signature_platform": "dotloop | docusign | hellosign | none | unknown"
}`;

    const classifyResult = await base44.integrations.Core.InvokeLLM({
      prompt: classifyPrompt,
      file_urls: [document_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          page_count: { type: "number" },
          has_digital_signature_verification: { type: "boolean" },
          digital_signature_platform: { type: "string" },
        }
      }
    });

    const docType = classifyResult.document_type || "Other";
    const pageCount = classifyResult.page_count || 1;
    const hasDigitalSig = classifyResult.has_digital_signature_verification || false;
    const template = getTemplate(docType);
    const templateContext = buildTemplateContext(template, docType);
    const companionDocs = template?.companion_docs || [];

    // Second pass: deep page-level analysis
    const deepPrompt = `You are a strict real estate compliance engine for New Hampshire (NHAR) real estate transactions.

Transaction context:
- Address: ${transaction_data?.address || 'Unknown'}
- Transaction Type: ${transaction_data?.transaction_type || 'buyer'}
- Is Cash Transaction: ${transaction_data?.is_cash_transaction ? 'Yes' : 'No'}
- Sale Price: ${transaction_data?.sale_price ? '$' + Number(transaction_data.sale_price).toLocaleString() : 'Unknown'}
- Document Type: ${docType}
- Total Pages: ${pageCount}
- Digital Signature Detected: ${hasDigitalSig ? 'Yes (' + (classifyResult.digital_signature_platform || 'unknown platform') + ')' : 'No'}

${templateContext}

INSTRUCTIONS:
Analyze this document with PAGE-LEVEL ACCURACY. For each issue, identify the EXACT page number where it occurs.

1. SIGNATURE DETECTION
${hasDigitalSig
  ? '- Document contains digital signature verification. Mark all digitally-verified signatures as "present". Check if all required parties have signed.'
  : '- Check each signature block. "present" = filled/signed, "missing" = blank line exists but unsigned, "not_found" = no signature block exists for that party.'
}
Check: buyer_signature, seller_signature, buyer_agent_signature, seller_agent_signature
For each missing signature, note which PAGE it should appear on.

2. INITIALS CHECK (if P&S Agreement)
${template?.initials_required
  ? `This is a P&S Agreement. Check EVERY interior page (pages 2 through ${pageCount - 1}) for buyer and seller initials in the footer.
List each page number where initials are MISSING.`
  : 'Initials not required for this document type.'
}

3. REQUIRED FIELD DETECTION
Check these required fields and note the page where each is located or missing:
${template?.required_fields.map(f => `- "${f.label}" (expected page ${f.page})`).join('\n') || 'Extract all key fields.'}
Also check for any field containing "______", "[  ]", or obviously blank where a value is required.

4. FIELD EXTRACTION
Extract as many of these as you can find:
purchase_price (number), earnest_money (number), buyer_name, seller_name, buyers_agent, sellers_agent, 
closing_date (YYYY-MM-DD), inspection_deadline (YYYY-MM-DD), financing_deadline (YYYY-MM-DD), 
earnest_money_deadline (YYYY-MM-DD), property_address, commission_percent (number), effective_date (YYYY-MM-DD)

5. COMPLIANCE ISSUES
Generate issues. For EACH issue include the page_number where it occurs.
Severity:
- "blocker": Missing required signature, missing required field in executed document, contract potentially invalid
- "warning": Missing important info, blank deadline, recommended follow-up
- "info": Unusual terms, advisory notes

Also provide:
- suggested_task (short action item)
- suggested_email_subject (professional)
- suggested_email_body (reference property address: ${transaction_data?.address || '[Property Address]'})

6. UNUSUAL TERMS
Flag non-standard concessions (>$5,000), unusual contingency language, anything that may delay closing.

7. COMPLIANCE SCORE
Start at 100. Deduct: -20 per blocker, -7 per warning, -3 per blank required field. Minimum: 10.

Return ONLY valid JSON:
{
  "document_type": "${docType}",
  "page_count": ${pageCount},
  "extracted_fields": {
    "purchase_price": null, "earnest_money": null, "buyer_name": null, "seller_name": null,
    "buyers_agent": null, "sellers_agent": null, "closing_date": null, "inspection_deadline": null,
    "financing_deadline": null, "earnest_money_deadline": null, "property_address": null,
    "commission_percent": null, "effective_date": null
  },
  "signatures": {
    "buyer_signature": "present|missing|not_found",
    "seller_signature": "present|missing|not_found",
    "buyer_agent_signature": "present|missing|not_found",
    "seller_agent_signature": "present|missing|not_found"
  },
  "missing_initials_pages": [],
  "blank_fields": [],
  "issues": [
    {
      "id": "issue_1",
      "severity": "blocker|warning|info",
      "category": "missing_signature|missing_initial|missing_field|blank_field|missing_doc|contract_term|deadline|financial",
      "page_number": 1,
      "message": "Clear human-readable description",
      "field": "field_name_if_applicable",
      "suggested_task": "Short task name",
      "suggested_email_subject": "Professional email subject",
      "suggested_email_body": "Professional email body"
    }
  ],
  "missing_companion_docs": ${JSON.stringify(companionDocs)},
  "compliance_score": 100,
  "summary": "One sentence summary"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: deepPrompt,
      file_urls: [document_url],
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          page_count: { type: "number" },
          extracted_fields: { type: "object" },
          signatures: { type: "object" },
          missing_initials_pages: { type: "array", items: { type: "number" } },
          blank_fields: { type: "array", items: { type: "string" } },
          issues: { type: "array", items: { type: "object" } },
          missing_companion_docs: { type: "array", items: { type: "string" } },
          compliance_score: { type: "number" },
          summary: { type: "string" }
        }
      }
    });

    // Deduplicate issues by message
    const seenMessages = new Set();
    const issues = (result.issues || []).filter(i => {
      const key = `${i.category}:${i.message}:${i.page_number}`;
      if (seenMessages.has(key)) return false;
      seenMessages.add(key);
      return true;
    });

    const blockers = issues.filter(i => i.severity === 'blocker');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infoItems = issues.filter(i => i.severity === 'info');
    const status = blockers.length > 0 ? 'blockers' : warnings.length > 0 ? 'warnings' : 'compliant';

    // Delete existing report for this document
    if (document_id) {
      const existing = await base44.asServiceRole.entities.ComplianceReport.filter({ document_id });
      for (const r of existing) {
        await base44.asServiceRole.entities.ComplianceReport.delete(r.id);
      }
    }

    const report = await base44.asServiceRole.entities.ComplianceReport.create({
      transaction_id,
      brokerage_id,
      document_id: document_id || null,
      document_name: file_name || "Document",
      document_type: result.document_type || docType,
      page_count: result.page_count || pageCount,
      compliance_score: Math.max(10, Math.min(100, result.compliance_score || 100)),
      status,
      blockers,
      warnings,
      info_items: infoItems,
      all_issues: issues,
      extracted_fields: result.extracted_fields || {},
      signatures: result.signatures || {},
      missing_initials_pages: result.missing_initials_pages || [],
      blank_fields: result.blank_fields || [],
      missing_docs: result.missing_companion_docs || [],
      summary: result.summary || '',
      has_digital_signature: hasDigitalSig,
      digital_signature_platform: classifyResult.digital_signature_platform || null,
    });

    // Persist AI issues to ComplianceIssue entity
    if (document_id) {
      const oldAI = await base44.asServiceRole.entities.ComplianceIssue.filter({ transaction_id, document_id, source: "ai_scan" });
      for (const old of oldAI) {
        await base44.asServiceRole.entities.ComplianceIssue.delete(old.id);
      }
    }

    for (const issue of issues) {
      await base44.asServiceRole.entities.ComplianceIssue.create({
        transaction_id,
        document_id: document_id || null,
        brokerage_id: brokerage_id || null,
        issue_type: issue.category === "missing_signature" ? "signature"
          : issue.category === "missing_initial" ? "signature"
          : issue.category === "missing_doc" ? "missing_document"
          : issue.category === "financial" ? "financial"
          : issue.category === "deadline" ? "deadline"
          : "other",
        severity: issue.severity,
        message: issue.message,
        suggested_task: issue.suggested_task || null,
        status: "open",
        source: "ai_scan",
      });
    }

    // ─── 3. AUTO-MARK TRANSACTION NON-COMPLIANT IF BLOCKERS EXIST ────────────
    if (blockers.length > 0) {
      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        risk_level: "at_risk",
        last_activity_at: new Date().toISOString(),
      });
    }

    // ─── 4. AUTO-SEND COMPLIANCE EMAIL WITH PAGE-LEVEL ISSUE DETAILS ─────────
    if (blockers.length > 0 && transaction_data?.agent_email) {
      const issueLines = blockers.map((b, i) => {
        const pageRef = b.page_number ? ` (Page ${b.page_number})` : "";
        const category = b.category ? ` [${b.category.replace(/_/g, " ")}]` : "";
        return `${i + 1}. ${b.message}${pageRef}${category}`;
      }).join("\n");

      const missingInitialsSection = (result.missing_initials_pages || []).length > 0
        ? `\n\nMissing Initials on Pages: ${result.missing_initials_pages.join(", ")}\n(Buyer & Seller initials required in the footer of each interior page)`
        : "";

      const digitalSigNote = hasDigitalSig
        ? `\n\nNote: Digital signatures were detected via ${classifyResult.digital_signature_platform || "e-sign platform"}.`
        : "";

      const emailBody = `Hello,

A compliance scan has been completed for the document "${file_name || "Document"}" on the transaction at ${transaction_data?.address || "[Property Address]"}.

COMPLIANCE RESULT: ${status.toUpperCase()} (Score: ${report.compliance_score}/100)
Document Type: ${docType} · Pages: ${pageCount}${digitalSigNote}

BLOCKERS REQUIRING IMMEDIATE ATTENTION:
${issueLines}${missingInitialsSection}

Please review and correct these issues as soon as possible to avoid delays in closing.

This is an automated compliance alert from EliteTC.`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: transaction_data.agent_email,
        subject: `⚠ Compliance Blocker Detected — ${file_name || "Document"} · ${transaction_data?.address || "Transaction"}`,
        body: emailBody,
      });
    }

    return Response.json({
      success: true,
      report_id: report.id,
      status,
      score: report.compliance_score,
      issues_count: issues.length,
      blockers_count: blockers.length,
      missing_initials_pages: result.missing_initials_pages || [],
      deadline_issues_count: deadlineIssues.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});