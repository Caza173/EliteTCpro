import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

// ─── NHAR Document Templates ─────────────────────────────────────────────────
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
    initials_required: true,
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
const SIG_KEYWORDS   = ["signature", "signed", "sign", "sig"];
const INITIAL_KEYWORDS = ["initial", "initials", "init"];
const DATE_KEYWORDS  = ["date", "dated"];

function classifyField(name, fieldType) {
  const n = name.toLowerCase();
  if (fieldType === "PDFSignature") return "signature";
  if (INITIAL_KEYWORDS.some(k => n.includes(k))) return "initial";
  if (SIG_KEYWORDS.some(k => n.includes(k)) && !INITIAL_KEYWORDS.some(k => n.includes(k))) return "signature";
  if (DATE_KEYWORDS.some(k => n.includes(k))) return "date";
  return "field";
}

function classifyRole(name) {
  const n = name.toLowerCase();
  if (n.includes("buyer") && !n.includes("seller") && !n.includes("agent")) return "buyer";
  if (n.includes("seller") && !n.includes("buyer") && !n.includes("agent")) return "seller";
  if (n.includes("agent") || n.includes("firm") || n.includes("licensee")) return "agent";
  if (n.includes("buyer") && n.includes("agent")) return "agent";
  if (n.includes("seller") && n.includes("agent")) return "agent";
  return "unknown";
}

// Extract page number from field widget annotations
function getFieldPage(field, pdfDoc) {
  try {
    const widgets = field.acroField?.getWidgets?.() || [];
    if (widgets.length === 0) return null;
    const widget = widgets[0];
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const pageRef = pages[i].ref;
      const annotsArray = pages[i].node.lookupMaybe?.(pdfDoc.context?.PDFName?.of?.("Annots"))?.asArray?.() || [];
      for (const annotRef of annotsArray) {
        if (annotRef?.objectNumber === widget?.ref?.objectNumber) return i + 1;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function extractPdfFields(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const rawFields = form.getFields();
    const pageCount = pdfDoc.getPageCount();

    if (!rawFields || rawFields.length === 0) return { total: 0, fields: [], pageCount };

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
          try { value = f.acroField?.getDefaultAppearance() ? "signed" : ""; } catch { value = ""; }
          isEmpty = !value;
        }
      } catch {}

      const role = classifyRole(name);
      const fieldType = classifyField(name, constructor);
      const page = getFieldPage(f, pdfDoc);

      return { name, constructor, value, isEmpty, role, fieldType, page };
    });

    const signatureFields = fields.filter(f => f.fieldType === "signature");
    const initialFields   = fields.filter(f => f.fieldType === "initial");
    const missingSignatures = signatureFields.filter(f => f.isEmpty);
    const missingInitials   = initialFields.filter(f => f.isEmpty);

    // Group initials by page for per-page validation
    const initialsByPage = {};
    for (const f of initialFields) {
      const pg = f.page || "unknown";
      if (!initialsByPage[pg]) initialsByPage[pg] = { buyer: [], seller: [], agent: [], unknown: [], all: [] };
      initialsByPage[pg].all.push(f);
      (initialsByPage[pg][f.role] || initialsByPage[pg].unknown).push(f);
    }

    // Check for digital signature metadata in PDF
    let hasDigitalSig = false;
    let digitalPlatform = null;
    try {
      const info = pdfDoc.getInfoDict?.();
      const creator = pdfDoc.getCreator?.() || "";
      const producer = pdfDoc.getProducer?.() || "";
      const combined = (creator + " " + producer).toLowerCase();
      if (combined.includes("dotloop")) { hasDigitalSig = true; digitalPlatform = "Dotloop"; }
      else if (combined.includes("docusign")) { hasDigitalSig = true; digitalPlatform = "DocuSign"; }
      else if (combined.includes("hellosign") || combined.includes("dropbox sign")) { hasDigitalSig = true; digitalPlatform = "Dropbox Sign"; }
      else if (combined.includes("adobe sign")) { hasDigitalSig = true; digitalPlatform = "Adobe Sign"; }
      else if (signatureFields.some(f => !f.isEmpty)) { hasDigitalSig = true; digitalPlatform = "e-sign"; }
    } catch {}

    return {
      total: fields.length,
      pageCount,
      fields,
      signatureFields,
      initialFields,
      missingSignatures,
      missingInitials,
      initialsByPage,
      hasDigitalSig,
      digitalPlatform,
      hasMissingSignatures: missingSignatures.length > 0,
      hasMissingInitials: missingInitials.length > 0,
    };
  } catch (err) {
    console.warn("[complianceEngine] PDF field extraction failed:", err.message);
    return null;
  }
}

function buildPdfFieldContext(extracted) {
  if (!extracted || extracted.total === 0) return "";

  const lines = [`PDF FORM FIELDS EXTRACTED (${extracted.total} total, ${extracted.pageCount} pages — authoritative source):`];

  if (extracted.missingSignatures.length > 0) {
    lines.push(`\nMISSING SIGNATURE FIELDS (${extracted.missingSignatures.length}):`);
    extracted.missingSignatures.forEach(f => {
      const pg = f.page ? ` [Page ${f.page}]` : "";
      lines.push(`  ⛔ MISSING: "${f.name}" [role: ${f.role}]${pg} — field is blank/unsigned`);
    });
  }

  if (extracted.missingInitials.length > 0) {
    lines.push(`\nMISSING INITIAL FIELDS (${extracted.missingInitials.length}):`);
    extracted.missingInitials.forEach(f => {
      const pg = f.page ? ` [Page ${f.page}]` : "";
      lines.push(`  ⚠ MISSING: "${f.name}" [role: ${f.role}]${pg} — initials blank`);
    });
  }

  const filledSignatures = extracted.signatureFields.filter(f => !f.isEmpty);
  if (filledSignatures.length > 0) {
    lines.push(`\nCOMPLETED SIGNATURE FIELDS (${filledSignatures.length}):`);
    filledSignatures.forEach(f => {
      lines.push(`  ✓ "${f.name}" [role: ${f.role}]`);
    });
  }

  const missingOther = extracted.fields.filter(f => f.isEmpty && f.fieldType !== "signature" && f.fieldType !== "initial");
  if (missingOther.length > 0) {
    lines.push(`\nOTHER EMPTY FIELDS (${Math.min(missingOther.length, 25)}):`);
    missingOther.slice(0, 25).forEach(f => {
      lines.push(`  - "${f.name}" [${f.fieldType}] — empty`);
    });
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const { document_url, file_name, document_id, transaction_id, brokerage_id, transaction_data } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    // ─── STEP 1: Determine actual party counts from transaction data ──────────
    // This MUST happen before the prompt is built
    const buyerNames = transaction_data?.buyers?.length
      ? transaction_data.buyers
      : transaction_data?.buyer ? [transaction_data.buyer] : [];
    const sellerNames = transaction_data?.sellers?.length
      ? transaction_data.sellers
      : transaction_data?.seller ? [transaction_data.seller] : [];

    const buyerCount = buyerNames.length || 1;
    const sellerCount = sellerNames.length || 1;

    console.log(`[complianceEngine] Party counts — Buyers: ${buyerCount} (${buyerNames.join(", ")}), Sellers: ${sellerCount} (${sellerNames.join(", ")})`);

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

    // Persist deadline/financial issues
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

    // ─── 2. PDF ACROFORM FIELD EXTRACTION ────────────────────────────────────
    const pdfFields = await extractPdfFields(document_url);
    const pdfFieldContext = pdfFields ? buildPdfFieldContext(pdfFields) : "";
    const hasPdfFields = pdfFields && pdfFields.total > 0;
    const pdfPageCount = pdfFields?.pageCount || null;

    console.log(`[complianceEngine] PDF: ${pdfFields?.total || 0} fields, ${pdfPageCount} pages, ${pdfFields?.missingSignatures?.length || 0} missing sigs, ${pdfFields?.missingInitials?.length || 0} missing initials, digitalSig: ${pdfFields?.hasDigitalSig}`);

    // ─── 3. AI DOCUMENT SCAN ─────────────────────────────────────────────────
    const allNharTemplates = Object.keys(NHAR_TEMPLATES).join(" | ");

    const combinedPrompt = `You are a strict real estate compliance auditor for New Hampshire (NHAR) transactions.

Analyze this real estate document for compliance issues. Return structured JSON ONLY.

═══════════════════════════════════════════════
TRANSACTION CONTEXT
═══════════════════════════════════════════════
Address: ${transaction_data?.address || 'Unknown'}
Transaction Type: ${transaction_data?.transaction_type || 'buyer'}
Is Cash Transaction: ${transaction_data?.is_cash_transaction ? 'Yes' : 'No'}
Sale Price: ${transaction_data?.sale_price ? '$' + Number(transaction_data.sale_price).toLocaleString() : 'Unknown'}

PARTIES (CRITICAL — use ONLY these names, do NOT flag signature lines for parties not in this transaction):
  Buyer(s) [${buyerCount} total]: ${buyerNames.join(", ") || 'Unknown'}
  Seller(s) [${sellerCount} total]: ${sellerNames.join(", ") || 'Unknown'}
  Buyer's Agent: ${transaction_data?.buyers_agent_name || 'Unknown'}
  Seller's Agent: ${transaction_data?.sellers_agent_name || 'Unknown'}

═══════════════════════════════════════════════
PDF FORM FIELD DATA (AUTHORITATIVE — primary source of truth)
═══════════════════════════════════════════════
${pdfFieldContext || "No structured form fields detected — use visual/OCR analysis only."}
${pdfPageCount ? `Total pages: ${pdfPageCount}` : ""}

═══════════════════════════════════════════════
STEP 1: PARTY EXTRACTION (confirm from document)
═══════════════════════════════════════════════
Read Section 1 of the document. Confirm or correct the buyer(s) and seller(s) above.
If the document shows different names, use the document's names for validation.

═══════════════════════════════════════════════
STEP 2: SIGNATURE VALIDATION RULES
═══════════════════════════════════════════════
Required: EXACTLY ${buyerCount} buyer signature(s) and EXACTLY ${sellerCount} seller signature(s).

CRITICAL RULES:
- Many forms have extra blank signature lines for "additional buyers/sellers" — DO NOT flag those
- Only flag a signature as missing if it belongs to one of the NAMED parties above
- If detected_buyer_signatures < ${buyerCount} → flag each missing buyer by name
- If detected_seller_signatures < ${sellerCount} → flag each missing seller by name
- Agent signatures: always required on representation agreements — flag if blank
- Digital signature (Dotloop/DocuSign verified) = auto-pass for that party

MIXED SIGNING: If 1 of 2 buyers signed but not the other, flag ONLY the missing one.

═══════════════════════════════════════════════
STEP 3: INITIALS VALIDATION (per page)
═══════════════════════════════════════════════
For EACH interior page of the document:
- Check footer/margin for buyer initials (need ${buyerCount} set)
- Check footer/margin for seller initials (need ${sellerCount} set)
- If buyer_initials_found < ${buyerCount} → flag missing buyer initials on that page
- If seller_initials_found < ${sellerCount} → flag missing seller initials on that page
- Report each page separately as its own issue object
- Do NOT count empty initial boxes — only count actual initials present

═══════════════════════════════════════════════
ISSUE DETECTION REQUIREMENTS
═══════════════════════════════════════════════
List EVERY issue as a SEPARATE object. Do NOT group or summarize.

Issue types and their severity:
1. missing_signature → critical
   - party: "buyer" | "seller" | "agent"
   - party_name: the specific person's name (e.g. "John Smith")
   - page: signature page number
   - location: exact location (e.g. "Page 4, Buyer signature block, line 1")

2. missing_initial → high
   - party: "buyer" | "seller"
   - party_name: specific person's name
   - page: page number
   - location: e.g. "Page 2, bottom footer, buyer initials line"

3. blank_field → high (required) or medium (optional)
   - field: exact field name
   - page: page number
   - Examples: purchase price, earnest money, closing date, insulation disclosure, radon, lead paint checkboxes

4. invalid_date → critical
   - field: date field name
   - page: page number
   - reason: why it's invalid

5. missing_document → medium
   - companion documents that should accompany this document type

Document classification: one of: ${allNharTemplates} | Other

OUTPUT — return this exact JSON structure:
{
  "document_type": "...",
  "page_count": N,
  "confirmed_buyers": ["name1", "name2"],
  "confirmed_sellers": ["name1", "name2"],
  "detected_buyer_signatures": N,
  "detected_seller_signatures": N,
  "has_digital_signature_verification": bool,
  "digital_signature_platform": "Dotloop" | "DocuSign" | null,
  "issues": [
    {
      "id": "unique_id",
      "type": "missing_signature|missing_initial|blank_field|invalid_date|missing_document",
      "description": "clear one-sentence description",
      "party": "buyer|seller|agent|null",
      "party_name": "specific person name or null",
      "field": "field or section name",
      "location": "exact location string",
      "page": N,
      "severity": "critical|high|medium|low",
      "action_required": "specific corrective action"
    }
  ],
  "extracted_fields": {
    "purchase_price": null,
    "earnest_money": null,
    "buyer_name": null,
    "seller_name": null,
    "closing_date": null,
    "inspection_deadline": null,
    "financing_deadline": null,
    "property_address": null
  },
  "missing_companion_docs": [],
  "compliance_score": N,
  "summary": "one sentence summary"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: combinedPrompt,
      file_urls: [document_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          page_count: { type: "number" },
          confirmed_buyers: { type: "array", items: { type: "string" } },
          confirmed_sellers: { type: "array", items: { type: "string" } },
          detected_buyer_signatures: { type: "number" },
          detected_seller_signatures: { type: "number" },
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
                party: { type: "string" },
                party_name: { type: "string" },
                field: { type: "string" },
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
    const pageCount = result.page_count || pdfPageCount || 1;
    const hasDigitalSig = result.has_digital_signature_verification || pdfFields?.hasDigitalSig || false;
    const digitalPlatform = result.digital_signature_platform || pdfFields?.digitalPlatform || null;
    const template = getTemplate(docType);

    // ── Build PDF-derived issues (authoritative for form fields) ─────────────
    const pdfDerivedIssues = [];
    if (pdfFields && hasPdfFields) {
      const missingSigsByRole = { buyer: [], seller: [], agent: [], unknown: [] };
      for (const f of (pdfFields.missingSignatures || [])) {
        const role = f.role !== "unknown" ? f.role : "unknown";
        (missingSigsByRole[role] = missingSigsByRole[role] || []).push(f);
      }

      // Cap by actual party count — don't over-flag unused template lines
      const roleLimits = { buyer: buyerCount, seller: sellerCount, agent: 1, unknown: 1 };
      for (const [role, fields] of Object.entries(missingSigsByRole)) {
        const limit = roleLimits[role] ?? fields.length;
        const toFlag = fields.slice(0, limit);
        const namesForRole = role === "buyer" ? buyerNames : role === "seller" ? sellerNames : [];
        toFlag.forEach((f, idx) => {
          const partyName = namesForRole[idx] || null;
          pdfDerivedIssues.push({
            id: `pdf_sig_${f.name}`,
            type: "missing_signature",
            description: `Missing ${partyName || role} signature: "${f.name}"${f.page ? ` (Page ${f.page})` : ""}`,
            field: f.name,
            party: role !== "unknown" ? role : null,
            party_name: partyName,
            location: f.page ? `Page ${f.page}, signature field "${f.name}"` : `Signature field "${f.name}"`,
            page: f.page,
            severity: "critical",
            action_required: `Obtain ${partyName || role} signature for "${f.name}"`,
            category: "missing_signature",
            message: `Missing ${partyName || role} signature field: "${f.name}"`,
            suggested_task: `Obtain signature for field "${f.name}"`,
          });
        });
      }

      // Per-page initials validation from PDF fields
      for (const [pg, pageData] of Object.entries(pdfFields.initialsByPage || {})) {
        const missingBuyerInitials = pageData.buyer.filter(f => f.isEmpty).slice(0, buyerCount);
        const missingSellerInitials = pageData.seller.filter(f => f.isEmpty).slice(0, sellerCount);

        missingBuyerInitials.forEach((f, idx) => {
          const partyName = buyerNames[idx] || null;
          pdfDerivedIssues.push({
            id: `pdf_init_buyer_${pg}_${idx}`,
            type: "missing_initial",
            description: `Missing ${partyName || "buyer"} initials on Page ${pg}`,
            field: f.name,
            party: "buyer",
            party_name: partyName,
            location: `Page ${pg}, footer/margin buyer initials`,
            page: parseInt(pg) || null,
            severity: "high",
            action_required: `Obtain ${partyName || "buyer"} initials on page ${pg}`,
            category: "missing_initial",
            message: `Missing buyer initials on Page ${pg}`,
            suggested_task: `Add buyer initials to page ${pg}`,
          });
        });

        missingSellerInitials.forEach((f, idx) => {
          const partyName = sellerNames[idx] || null;
          pdfDerivedIssues.push({
            id: `pdf_init_seller_${pg}_${idx}`,
            type: "missing_initial",
            description: `Missing ${partyName || "seller"} initials on Page ${pg}`,
            field: f.name,
            party: "seller",
            party_name: partyName,
            location: `Page ${pg}, footer/margin seller initials`,
            page: parseInt(pg) || null,
            severity: "high",
            action_required: `Obtain ${partyName || "seller"} initials on page ${pg}`,
            category: "missing_initial",
            message: `Missing seller initials on Page ${pg}`,
            suggested_task: `Add seller initials to page ${pg}`,
          });
        });
      }
    }

    // Normalize AI issues, deduplicate against PDF-derived
    const seenFields = new Set(pdfDerivedIssues.map(i => i.field).filter(Boolean));
    const seenDescriptions = new Set(pdfDerivedIssues.map(i => i.description));

    const aiIssues = (result.issues || []).map((i, idx) => ({
      id: i.id || `ai_${idx}`,
      type: i.type || "blank_field",
      description: i.description || i.message || "Compliance issue detected",
      field: i.field || null,
      party: i.party || null,
      party_name: i.party_name || null,
      location: i.location || (i.page ? `Page ${i.page}` : null),
      page: i.page || null,
      severity: i.severity || "medium",
      action_required: i.action_required || i.suggested_task || "Review and correct",
      category: i.type || "other",
      message: i.description || i.message || "Compliance issue detected",
      suggested_task: i.action_required || i.suggested_task || null,
      page_number: i.page || null,
    })).filter(i => {
      // Deduplicate: skip AI issue if PDF already caught it by field name or description
      if (i.field && seenFields.has(i.field)) return false;
      if (seenDescriptions.has(i.description)) return false;
      seenFields.add(i.field || i.id);
      seenDescriptions.add(i.description);
      return true;
    });

    const issues = [...pdfDerivedIssues, ...aiIssues];

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
      page_count: pageCount,
      compliance_score: Math.max(10, Math.min(100, result.compliance_score || 100)),
      status,
      blockers,
      warnings,
      info_items: infoItems,
      all_issues: issues,
      extracted_fields: result.extracted_fields || {},
      signatures: {
        detected_buyer: result.detected_buyer_signatures ?? null,
        detected_seller: result.detected_seller_signatures ?? null,
        required_buyers: buyerCount,
        required_sellers: sellerCount,
        confirmed_buyers: result.confirmed_buyers || buyerNames,
        confirmed_sellers: result.confirmed_sellers || sellerNames,
      },
      missing_initials_pages: [],
      blank_fields: [],
      missing_docs: result.missing_companion_docs || [],
      summary: result.summary || '',
      has_digital_signature: hasDigitalSig,
      digital_signature_platform: digitalPlatform,
    });

    // Persist issues to ComplianceIssue entity
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
        issue_type: issue.type === "missing_signature" ? "signature"
          : issue.type === "missing_initial" ? "signature"
          : issue.type === "missing_document" ? "missing_document"
          : issue.type === "financial" ? "financial"
          : issue.type === "deadline" ? "deadline"
          : "other",
        severity: issue.severity,
        message: issue.message,
        suggested_task: issue.suggested_task || null,
        status: "open",
        source: "ai_scan",
      });
    }

    // Auto-mark at-risk if blockers
    if (blockers.length > 0) {
      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        risk_level: "at_risk",
        last_activity_at: new Date().toISOString(),
      });
    }

    // Auto-send compliance email
    if (blockers.length > 0 && transaction_data?.agent_email) {
      const issueLines = blockers.map((b, i) => {
        const pageRef = b.page ? ` (Page ${b.page})` : "";
        const partyRef = b.party_name ? ` — ${b.party_name}` : b.party ? ` — ${b.party}` : "";
        return `${i + 1}. ${b.message}${partyRef}${pageRef}`;
      }).join("\n");

      const sigSummary = `Detected signatures: ${result.detected_buyer_signatures ?? "?"} buyer / ${result.detected_seller_signatures ?? "?"} seller (required: ${buyerCount} buyer / ${sellerCount} seller)`;
      const digitalNote = hasDigitalSig ? `\nDigital signatures detected via ${digitalPlatform || "e-sign platform"}.` : "";

      const emailBody = `Hello,

A compliance scan has been completed for "${file_name || "Document"}" at ${transaction_data?.address || "[Property Address]"}.

COMPLIANCE RESULT: ${status.toUpperCase()} (Score: ${report.compliance_score}/100)
Document Type: ${docType} · Pages: ${pageCount}
${sigSummary}${digitalNote}

BLOCKERS REQUIRING IMMEDIATE ATTENTION:
${issueLines}

Please review and correct these issues as soon as possible to avoid closing delays.

— EliteTC Compliance Engine`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: transaction_data.agent_email,
        subject: `⚠ Compliance Blocker — ${file_name || "Document"} · ${transaction_data?.address || "Transaction"}`,
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
      missing_signatures: blockers.filter(i => i.type === "missing_signature").length,
      missing_initials: issues.filter(i => i.type === "missing_initial").length,
      required_buyers: buyerCount,
      required_sellers: sellerCount,
      detected_buyer_signatures: result.detected_buyer_signatures ?? null,
      detected_seller_signatures: result.detected_seller_signatures ?? null,
      has_digital_signature: hasDigitalSig,
      digital_platform: digitalPlatform,
      deadline_issues_count: deadlineIssues.length,
    });

  } catch (error) {
    console.error("[complianceEngine] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});