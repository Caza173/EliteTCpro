import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_url, file_name, document_id, transaction_id, brokerage_id, transaction_data } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    // --- 1. DEADLINE MONITORING (no document required) ---
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
            issue_type: "deadline",
            severity: "blocker",
            message: `${label} was ${Math.abs(daysLeft)} day(s) ago (${dateStr}) and may be overdue.`,
            suggested_task: `Confirm ${label} status with all parties`,
          });
        } else if (daysLeft <= 7) {
          deadlineIssues.push({
            issue_type: "deadline",
            severity: "warning",
            message: `${label} is approaching in ${daysLeft} day(s) (${dateStr}).`,
            suggested_task: `Follow up on ${label}`,
          });
        }
      }

      // --- 2. FINANCIAL REVIEW ---
      if (transaction_data.sale_price) {
        const salePrice = transaction_data.sale_price;
        const concession = transaction_data.seller_concession_amount || 0;
        const proFee = transaction_data.professional_fee_amount || 0;

        if (concession > 0) {
          const concPct = (concession / salePrice) * 100;
          if (concPct > 3) {
            deadlineIssues.push({
              issue_type: "financial",
              severity: "warning",
              message: `Seller concession of $${concession.toLocaleString()} (${concPct.toFixed(1)}% of sale price) is unusually high. Verify with lender.`,
              suggested_task: "Confirm seller concession with lender for loan compliance",
            });
          }
        }

        if (proFee > 0) {
          const feePct = (proFee / salePrice) * 100;
          if (feePct > 2) {
            deadlineIssues.push({
              issue_type: "financial",
              severity: "info",
              message: `Professional fee of $${proFee.toLocaleString()} (${feePct.toFixed(1)}% of sale price) — review for accuracy.`,
              suggested_task: "Review Section 20 professional fee amount",
            });
          }
        }
      }

      // --- 3. REQUIRED DOCUMENT CHECK ---
      if (transaction_data.checklist_items) {
        for (const item of transaction_data.checklist_items) {
          if (item.required && item.status === "missing" && item.required_by_phase <= (transaction_data.phase || 3)) {
            deadlineIssues.push({
              issue_type: "missing_document",
              severity: "warning",
              message: `Required document missing: ${item.label || item.doc_type}. Required by Phase ${item.required_by_phase}.`,
              suggested_task: `Upload ${item.label || item.doc_type}`,
            });
          }
        }
      }
    }

    // Persist deadline/financial/doc issues to ComplianceIssue entity
    // Clear old non-ai issues for this transaction first
    const existingNonAI = await base44.asServiceRole.entities.ComplianceIssue.filter({
      transaction_id,
      source: "deadline_check",
    });
    for (const old of existingNonAI) {
      await base44.asServiceRole.entities.ComplianceIssue.delete(old.id);
    }
    const existingFinancial = await base44.asServiceRole.entities.ComplianceIssue.filter({
      transaction_id,
      source: "financial_check",
    });
    for (const old of existingFinancial) {
      await base44.asServiceRole.entities.ComplianceIssue.delete(old.id);
    }

    for (const issue of deadlineIssues) {
      const sourceMap = { deadline: "deadline_check", financial: "financial_check", missing_document: "deadline_check" };
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

    // If no document provided, return deadline results only
    if (!document_url) {
      return Response.json({
        success: true,
        deadline_issues_count: deadlineIssues.length,
        message: "Deadline and financial checks complete",
      });
    }

    // --- 4. DOCUMENT AI ANALYSIS ---
    const prompt = `You are a real estate compliance engine for a New Hampshire Transaction Coordinator platform.

Analyze this real estate document carefully and return a structured compliance report.

Transaction context:
- Address: ${transaction_data?.address || 'Unknown'}
- Transaction Type: ${transaction_data?.transaction_type || 'buyer'}
- Is Cash Transaction: ${transaction_data?.is_cash_transaction ? 'Yes' : 'No'}
- Sale Price: ${transaction_data?.sale_price ? '$' + transaction_data.sale_price.toLocaleString() : 'Unknown'}

Perform ALL of the following:

1. DOCUMENT CLASSIFICATION
Classify the document as one of:
"Purchase and Sales Agreement" | "Agency Disclosure" | "Property Disclosure" | "Lead Paint Disclosure" | "Inspection Report" | "Appraisal" | "Closing Disclosure" | "Addendum" | "Earnest Money Receipt" | "Other"

2. FIELD EXTRACTION
Extract these fields if found:
- purchase_price (number)
- earnest_money (number)
- buyer_name (string)
- seller_name (string)
- buyers_agent (string)
- sellers_agent (string)
- closing_date (YYYY-MM-DD)
- inspection_deadline (YYYY-MM-DD)
- financing_deadline (YYYY-MM-DD)
- earnest_money_deadline (YYYY-MM-DD)
- property_address (string)
- commission_percent (number)

3. SIGNATURE DETECTION
Look for signature lines and blocks. Determine for each:
- "present" = signature line exists AND appears filled/signed
- "missing" = signature line exists but appears blank or unsigned
- "not_found" = no signature line found for this party
Check: buyer_signature, seller_signature, buyer_agent_signature, seller_agent_signature

4. BLANK FIELD DETECTION
List important fields that appear blank (contain "______", "[  ]", "N/A" where a value is expected, or are clearly missing data that should be present in this document type).

5. COMPLIANCE ISSUES
Generate issues with severity:
- "blocker": Makes contract potentially invalid (e.g., missing required signature, missing purchase price in P&S)
- "warning": Missing important info (e.g., blank deadline, missing earnest money amount)
- "info": Advisory (e.g., unusual term, recommended follow-up)

For EACH issue, also provide:
- A suggested task name to resolve it
- A professional email subject line
- A professional email body (addressed to "Agent" generically, referencing the property address ${transaction_data?.address || '[Property Address]'})

6. UNUSUAL TERMS & FINANCIAL FLAGS
Identify any:
- Unusual seller concessions (flag if > $5,000 or if language seems non-standard)
- Non-standard commission structures
- Unusual contingency language
- Any clauses that might delay or complicate closing
Report these as "info" or "warning" issues.

7. MISSING COMPANION DOCUMENTS
Based on the document type identified, list companion docs that are typically required:
- P&S → Agency Disclosure, Property Disclosure, Lead Paint Disclosure (if pre-1978 or unknown), Earnest Money Receipt
- Inspection Report → verify signed repair request if issues found
- Closing Disclosure → verify all addenda are attached

8. COMPLIANCE SCORE (0-100)
Start at 100.
- Each blocker: -20 points
- Each warning: -7 points
- Each blank critical field: -5 points
Minimum score: 10.

Return ONLY valid JSON matching this exact structure:
{
  "document_type": "string",
  "extracted_fields": {
    "purchase_price": null,
    "earnest_money": null,
    "buyer_name": null,
    "seller_name": null,
    "buyers_agent": null,
    "sellers_agent": null,
    "closing_date": null,
    "inspection_deadline": null,
    "financing_deadline": null,
    "earnest_money_deadline": null,
    "property_address": null,
    "commission_percent": null
  },
  "signatures": {
    "buyer_signature": "present|missing|not_found",
    "seller_signature": "present|missing|not_found",
    "buyer_agent_signature": "present|missing|not_found",
    "seller_agent_signature": "present|missing|not_found"
  },
  "blank_fields": [],
  "issues": [
    {
      "id": "issue_1",
      "severity": "blocker|warning|info",
      "category": "signature|blank_field|missing_doc|contract_term|deadline|financial",
      "message": "Clear human-readable description of the issue",
      "field": "field_name_if_applicable",
      "suggested_task": "Short task name to resolve this",
      "suggested_email_subject": "Professional email subject line",
      "suggested_email_body": "Professional email body text"
    }
  ],
  "missing_companion_docs": [],
  "compliance_score": 100,
  "summary": "One sentence summary of document compliance status"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [document_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          extracted_fields: { type: "object" },
          signatures: { type: "object" },
          blank_fields: { type: "array", items: { type: "string" } },
          issues: { type: "array", items: { type: "object" } },
          missing_companion_docs: { type: "array", items: { type: "string" } },
          compliance_score: { type: "number" },
          summary: { type: "string" }
        }
      }
    });

    const issues = result.issues || [];
    const blockers = issues.filter(i => i.severity === 'blocker');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infoItems = issues.filter(i => i.severity === 'info');
    const status = blockers.length > 0 ? 'blockers' : warnings.length > 0 ? 'warnings' : 'compliant';

    // Delete existing report for this document if re-scanning
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
      document_type: result.document_type || "Other",
      compliance_score: Math.max(10, Math.min(100, result.compliance_score || 100)),
      status,
      blockers,
      warnings,
      info_items: infoItems,
      all_issues: issues,
      extracted_fields: result.extracted_fields || {},
      signatures: result.signatures || {},
      blank_fields: result.blank_fields || [],
      missing_docs: result.missing_companion_docs || [],
      summary: result.summary || ''
    });

    // Also persist AI-found issues to ComplianceIssue entity (for cross-transaction tracking)
    // Clear old ai_scan issues for this document first
    if (document_id) {
      const oldAI = await base44.asServiceRole.entities.ComplianceIssue.filter({
        transaction_id,
        document_id,
        source: "ai_scan",
      });
      for (const old of oldAI) {
        await base44.asServiceRole.entities.ComplianceIssue.delete(old.id);
      }
    }

    for (const issue of issues) {
      await base44.asServiceRole.entities.ComplianceIssue.create({
        transaction_id,
        document_id: document_id || null,
        brokerage_id: brokerage_id || null,
        issue_type: issue.category === "signature" ? "signature"
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

    return Response.json({
      success: true,
      report_id: report.id,
      status,
      score: report.compliance_score,
      issues_count: issues.length,
      deadline_issues_count: deadlineIssues.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});