import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { document_url, file_name, document_id, transaction_id, brokerage_id, transaction_data } = await req.json();

    if (!document_url || !transaction_id) {
      return Response.json({ error: 'document_url and transaction_id required' }, { status: 400 });
    }

    const prompt = `You are a real estate compliance engine for a New Hampshire Transaction Coordinator platform.

Analyze this real estate document carefully and return a structured compliance report.

Transaction context:
- Address: ${transaction_data?.address || 'Unknown'}
- Transaction Type: ${transaction_data?.transaction_type || 'buyer'}
- Is Cash Transaction: ${transaction_data?.is_cash_transaction ? 'Yes' : 'No'}

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
- "info": Advisory (e.g., deadline approaching, recommended follow-up)

For EACH issue, also provide:
- A suggested task name to resolve it
- A professional email subject line
- A professional email body (addressed to "Agent" generically, referencing the property address ${transaction_data?.address || '[Property Address]'})

6. MISSING COMPANION DOCUMENTS
Based on the document type identified, list companion docs that are typically required:
- P&S → Agency Disclosure, Property Disclosure, Lead Paint Disclosure (if pre-1978 or unknown), Earnest Money Receipt
- Inspection Report → verify signed repair request if issues found
- Closing Disclosure → verify all addenda are attached

7. COMPLIANCE SCORE (0-100)
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
      "category": "signature|blank_field|missing_doc|contract_term|deadline",
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

    return Response.json({ success: true, report_id: report.id, status, score: report.compliance_score });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});