import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

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

// ─── PDF AcroForm Field Extraction ───────────────────────────────────────────
// Classify a field name into its compliance role
const SIG_KEYWORDS   = ["signature", "signed", "sign", "sig", "buyer", "seller"];
const INITIAL_KEYWORDS = ["initial", "initials", "init"];
const DATE_KEYWORDS  = ["date", "dated"];

function classifyField(name, fieldType) {
  const n = name.toLowerCase();
  const isSignature = fieldType === "PDFSignature"
    || (SIG_KEYWORDS.some(k => n.includes(k)) && !INITIAL_KEYWORDS.some(k => n.includes(k)));
  const isInitial   = INITIAL_KEYWORDS.some(k => n.includes(k));
  const isDate      = DATE_KEYWORDS.some(k => n.includes(k));
  if (isSignature) return "signature";
  if (isInitial)   return "initial";
  if (isDate)      return "date";
  return "field";
}

function classifyRole(name) {
  const n = name.toLowerCase();
  if (n.includes("buyer") && !n.includes("seller"))  return "buyer";
  if (n.includes("seller") && !n.includes("buyer"))  return "seller";
  if (n.includes("agent") || n.includes("firm"))     return "agent";
  return "unknown";
}

async function extractPdfFields(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const rawFields = form.getFields();

    if (!rawFields || rawFields.length === 0) return null;

    const fields = rawFields.map(f => {
      const name = f.getName() || "";
      const constructor = f.constructor?.name || "Unknown";
      let value = null;
      let isEmpty = true;

      try {
        if (constructor === "PDFTextField") {
          value = f.getText() || "";
          isEmpty = !value || !value.trim();
        } else if (constructor === "PDFCheckBox") {
          value = f.isChecked() ? "checked" : "unchecked";
          isEmpty = !f.isChecked();
        } else if (constructor === "PDFDropdown" || constructor === "PDFOptionList") {
          value = f.getSelected()?.join(", ") || "";
          isEmpty = !value;
        } else if (constructor === "PDFSignature") {
          // Signature fields — check if they have any value
          try { value = f.acroField?.getDefaultAppearance() ? "signed" : ""; } catch { value = ""; }
          isEmpty = !value;
        }
      } catch {}

      const role      = classifyRole(name);
      const fieldType = classifyField(name, constructor);

      return { name, constructor, value, isEmpty, role, fieldType };
    });

    // Build summary: missing required fields
    const signatureFields = fields.filter(f => f.fieldType === "signature");
    const initialFields   = fields.filter(f => f.fieldType === "initial");
    const missingSignatures = signatureFields.filter(f => f.isEmpty);
    const missingInitials   = initialFields.filter(f => f.isEmpty);
    const allFields = fields;

    return {
      total: fields.length,
      fields: allFields,
      signatureFields,
      initialFields,
      missingSignatures,
      missingInitials,
      hasMissingSignatures: missingSignatures.length > 0,
      hasMissingInitials:   missingInitials.length > 0,
    };
  } catch (err) {
    console.warn("[complianceEngine] PDF field extraction failed:", err.message);
    return null;
  }
}

function buildPdfFieldContext(extracted) {
  if (!extracted || extracted.total === 0) return "";

  const lines = [`PDF FORM FIELDS EXTRACTED (${extracted.total} total — primary source of truth):`];

  if (extracted.missingSignatures.length > 0) {
    lines.push(`\nMISSING SIGNATURE FIELDS (${extracted.missingSignatures.length}):`);
    extracted.missingSignatures.forEach(f => {
      lines.push(`  ⛔ MISSING: "${f.name}" [role: ${f.role}] — field is blank/unsigned`);
    });
  }

  if (extracted.missingInitials.length > 0) {
    lines.push(`\nMISSING INITIAL FIELDS (${extracted.missingInitials.length}):`);
    extracted.missingInitials.forEach(f => {
      lines.push(`  ⚠ MISSING: "${f.name}" [role: ${f.role}] — initials blank`);
    });
  }

  const missingOther = extracted.fields.filter(
    f => f.isEmpty && f.fieldType !== "signature" && f.fieldType !== "initial"
  );
  if (missingOther.length > 0) {
    lines.push(`\nOTHER EMPTY FIELDS (${missingOther.length}):`);
    missingOther.slice(0, 20).forEach(f => {
      lines.push(`  - "${f.name}" [${f.fieldType}] — empty`);
    });
  }

  const filledSignatures = extracted.signatureFields.filter(f => !f.isEmpty);
  if (filledSignatures.length > 0) {
    lines.push(`\nCOMPLETED SIGNATURE FIELDS (${filledSignatures.length}):`);
    filledSignatures.forEach(f => {
      lines.push(`  ✓ "${f.name}" [role: ${f.role}]`);
    });
  }

  return lines.join("\n");
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
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    // Allow service-role calls (from automations) without user auth

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

    // ─── 2. PDF ACROFORM FIELD EXTRACTION (primary source of truth) ──────────
    const pdfFields = await extractPdfFields(document_url);
    const pdfFieldContext = buildPdfFieldContext(pdfFields);
    const hasPdfFields = pdfFields && pdfFields.total > 0;

    console.log(`[complianceEngine] PDF fields extracted: ${pdfFields?.total || 0} (missing sigs: ${pdfFields?.missingSignatures?.length || 0}, missing initials: ${pdfFields?.missingInitials?.length || 0})`);

    // ─── 3. SINGLE-PASS AI DOCUMENT SCAN ─────────────────────────────────────
    const allNharTemplates = Object.keys(NHAR_TEMPLATES).join(" | ");
    const companionDocsFallback = [];

    const combinedPrompt = `You are a strict real estate compliance auditor for New Hampshire (NHAR) transactions.

Analyze this real estate document for compliance. Return structured issues ONLY — do NOT summarize.

Transaction context:
- Address: ${transaction_data?.address || 'Unknown'}
- Transaction Type: ${transaction_data?.transaction_type || 'buyer'}
- Is Cash Transaction: ${transaction_data?.is_cash_transaction ? 'Yes' : 'No'}
- Sale Price: ${transaction_data?.sale_price ? '$' + Number(transaction_data.sale_price).toLocaleString() : 'Unknown'}

${pdfFieldContext ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF FORM FIELD DATA (AUTHORITATIVE — use as primary source):
${pdfFieldContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : "No structured form fields detected — use visual/OCR analysis only."}

DOCUMENT CLASSIFICATION:
Identify: document_type (one of: ${allNharTemplates} | Other), page_count, digital signature platform if present.

ISSUE DETECTION RULES — list EVERY issue individually, do NOT group:
1. SIGNATURE BLOCKS — check every page for signature lines:
   - Is each signature block signed or blank?
   - Identify exact party: buyer, seller, agent
   - Include exact page number and location (e.g. "Bottom of page 3, Seller signature line")
   - Type: missing_signature

2. INITIALS — check footer/margin of every interior page:
   - Are buyer AND seller initials present on each page?
   - If missing on any page, report each page separately
   - Type: missing_initial, include page number

3. BLANK FIELDS — scan for any required field left blank:
   - Purchase price, earnest money amount, closing date, property address, buyer name, seller name
   - Also: insulation disclosures, fuel tank fields, radon, lead paint checkboxes, etc.
   - Include exact field name and page number
   - Type: blank_field

4. INVALID DATES — check all dates:
   - Is the year correct (current or near-future)?
   - Are dates logically consistent (e.g. closing after contract)?
   - Type: invalid_date, include field name and page

5. MISSING DOCUMENTS — based on document type, flag required companion docs
   - Type: missing_document

For EVERY issue you MUST provide:
- type: missing_signature | missing_initial | blank_field | invalid_date | missing_document
- description: clear one-sentence description (e.g. "Buyer signature is missing on page 4")
- field: exact field or section name
- party: buyer | seller | agent (whoever is responsible)
- location: exact location (e.g. "Page 4, bottom signature block")
- page: page number (integer)
- severity: critical (missing sig/date) | high (blank required field) | medium (blank optional field) | low (minor)
- action_required: specific action (e.g. "Obtain buyer signature on page 4")

OUTPUT FORMAT — return JSON only, no explanations outside JSON:
{
  "document_type": "...",
  "page_count": N,
  "has_digital_signature_verification": bool,
  "digital_signature_platform": "...",
  "issues": [ ...one object per issue... ],
  "extracted_fields": { purchase_price, earnest_money, buyer_name, seller_name, closing_date, inspection_deadline, financing_deadline, property_address },
  "missing_companion_docs": [...],
  "compliance_score": N,
  "summary": "one sentence"
}

Do NOT summarize issues. Do NOT generalize. List every issue as its own object.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: combinedPrompt,
      file_urls: [document_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          page_count: { type: "number" },
          has_digital_signature_verification: { type: "boolean" },
          digital_signature_platform: { type: "string" },
          extracted_fields: { type: "object" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                field: { type: "string" },
                party: { type: "string" },
                location: { type: "string" },
                page: { type: "number" },
                severity: { type: "string" },
                action_required: { type: "string" },
              }
            }
          },
          missing_companion_docs: { type: "array", items: { type: "string" } },
          compliance_score: { type: "number" },
          summary: { type: "string" }
        }
      }
    });

    const docType = result.document_type || "Other";
    const pageCount = result.page_count || 1;
    const hasDigitalSig = result.has_digital_signature_verification || false;
    const template = getTemplate(docType);
    const companionDocs = template?.companion_docs || companionDocsFallback;

    // ── Inject PDF-derived issues as authoritative ground truth ──────────────
    const pdfDerivedIssues = [];
    if (pdfFields && hasPdfFields) {
      for (const f of (pdfFields.missingSignatures || [])) {
        pdfDerivedIssues.push({
          id: `pdf_sig_${f.name}`,
          type: "missing_signature",
          description: `Missing ${f.role !== "unknown" ? f.role + " " : ""}signature: "${f.name}"`,
          field: f.name,
          party: f.role !== "unknown" ? f.role : null,
          location: `Signature field "${f.name}"`,
          page: null,
          severity: "critical",
          action_required: `Obtain ${f.role !== "unknown" ? f.role + " " : ""}signature for field "${f.name}"`,
          // Legacy compatibility
          category: "missing_signature",
          message: `Missing ${f.role !== "unknown" ? f.role + " " : ""}signature field: "${f.name}"`,
          suggested_task: `Obtain signature for field "${f.name}"`,
        });
      }
      for (const f of (pdfFields.missingInitials || [])) {
        pdfDerivedIssues.push({
          id: `pdf_init_${f.name}`,
          type: "missing_initial",
          description: `Missing ${f.role !== "unknown" ? f.role + " " : ""}initials: "${f.name}"`,
          field: f.name,
          party: f.role !== "unknown" ? f.role : null,
          location: `Initials field "${f.name}"`,
          page: null,
          severity: "high",
          action_required: `Obtain initials for field "${f.name}"`,
          category: "missing_initial",
          message: `Missing ${f.role !== "unknown" ? f.role + " " : ""}initials field: "${f.name}"`,
          suggested_task: `Obtain initials for field "${f.name}"`,
        });
      }
    }

    // Normalize AI issues to unified schema
    const seenFields = new Set(pdfDerivedIssues.map(i => i.field));
    const aiIssues = (result.issues || []).map((i, idx) => ({
      id: i.id || `ai_${idx}`,
      type: i.type || "blank_field",
      description: i.description || i.message || "Compliance issue detected",
      field: i.field || null,
      party: i.party || null,
      location: i.location || (i.page ? `Page ${i.page}` : null),
      page: i.page || i.page_number || null,
      severity: i.severity || "medium",
      action_required: i.action_required || i.suggested_task || "Review and correct",
      // Legacy compat
      category: i.type || i.category || "other",
      message: i.description || i.message || "Compliance issue detected",
      suggested_task: i.action_required || i.suggested_task || null,
      page_number: i.page || i.page_number || null,
    })).filter(i => {
      if (i.field && seenFields.has(i.field)) return false;
      seenFields.add(i.field || i.description);
      return true;
    });

    const issues = [...pdfDerivedIssues, ...aiIssues];

    // Map severity to old blocker/warning/info for backward compat
    const toOldSeverity = (s) => {
      if (s === "critical") return "blocker";
      if (s === "high") return "warning";
      if (s === "medium") return "warning";
      return "info";
    };
    const blockers = issues.filter(i => i.severity === "critical" || i.severity === "blocker");
    const warnings = issues.filter(i => i.severity === "high" || i.severity === "medium" || i.severity === "warning");
    const infoItems = issues.filter(i => i.severity === "low" || i.severity === "info");
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
      signatures: {},
      missing_initials_pages: [],
      blank_fields: [],
      missing_docs: result.missing_companion_docs || [],
      summary: result.summary || '',
      has_digital_signature: hasDigitalSig,
      digital_signature_platform: result.digital_signature_platform || null,
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
        ? `\n\nNote: Digital signatures were detected via ${result.digital_signature_platform || "e-sign platform"}.`
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