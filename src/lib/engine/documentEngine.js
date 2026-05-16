/**
 * EliteTC Document Engine
 * Determines required, optional, and missing documents
 * based on transaction type, property type, and financing type.
 * Deterministic — no AI.
 */

import { CLOSED_STATUSES } from "./constants.js";

// ─── Document Definitions ─────────────────────────────────────────────────────

const DOC_LABELS = {
  purchase_and_sale:      "Purchase & Sale Agreement",
  listing_agreement:      "Listing Agreement",
  buyer_agency_agreement: "Buyer Agency Agreement",
  disclosure:             "Property Disclosure",
  lead_paint_disclosure:  "Lead-Based Paint Disclosure",
  inspection:             "Inspection Report",
  appraisal:              "Appraisal Report",
  title:                  "Title Commitment",
  closing:                "Closing Disclosure / Settlement Statement",
  addendum:               "Addendum",
  other:                  "Other Document",
};

// ─── Required Docs Rules ──────────────────────────────────────────────────────

function getRequiredDocTypes(tx) {
  const required = new Set();
  const type     = (tx.transaction_type || tx.transactionType || "buyer").toLowerCase();
  const propType = (tx.property_type || "residential").toLowerCase();
  const isCash   = !!tx.is_cash_transaction;
  const yearBuilt = tx.year_built ? Number(tx.year_built) : null;

  // Always required
  required.add("purchase_and_sale");
  required.add("disclosure");

  // Transaction-type specific
  if (type === "buyer" || type === "dual") {
    required.add("buyer_agency_agreement");
  }
  if (type === "listing" || type === "seller" || type === "dual") {
    required.add("listing_agreement");
  }

  // Lead paint — pre-1978 properties
  if (propType !== "land" && yearBuilt && yearBuilt <= 1978) {
    required.add("lead_paint_disclosure");
  }

  // Financing docs (non-cash only)
  if (!isCash) {
    // No specific doc type in schema, but can be noted
  }

  return Array.from(required);
}

// ─── Match uploaded docs against required ─────────────────────────────────────

function getUploadedDocTypes(documents) {
  const types = new Set();
  for (const doc of documents) {
    if (doc.doc_type) types.add(doc.doc_type);
    // Infer from filename
    const name = (doc.file_name || "").toLowerCase();
    if (name.includes("p&s") || name.includes("purchase") || name.includes("psa")) {
      types.add("purchase_and_sale");
    }
    if (name.includes("listing")) types.add("listing_agreement");
    if (name.includes("agency") || name.includes("buyer agency")) types.add("buyer_agency_agreement");
    if (name.includes("disclosure")) types.add("disclosure");
    if (name.includes("lead") || name.includes("lead paint")) types.add("lead_paint_disclosure");
    if (name.includes("inspection")) types.add("inspection");
    if (name.includes("appraisal")) types.add("appraisal");
    if (name.includes("title")) types.add("title");
    if (name.includes("closing") || name.includes("hud") || name.includes("settlement")) types.add("closing");
  }
  return types;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Build document requirements state.
 * @param {object} tx        - Transaction record
 * @param {array}  documents - Document records
 * @param {array}  checklist - DocumentChecklistItem records
 */
export function buildDocumentRequirements(tx, documents = [], checklist = []) {
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());

  const requiredTypes = getRequiredDocTypes(tx);
  const uploadedTypes = getUploadedDocTypes(documents.filter(d => !d.is_deleted));

  const missingDocuments = isClosed ? [] : requiredTypes
    .filter(type => !uploadedTypes.has(type))
    .map(type => ({
      type,
      label: DOC_LABELS[type] || type,
      required: true,
    }));

  const uploadedDocs = documents
    .filter(d => !d.is_deleted)
    .map(d => ({
      id:       d.id,
      type:     d.doc_type || "other",
      label:    DOC_LABELS[d.doc_type] || d.file_name || "Document",
      fileName: d.file_name,
      fileUrl:  d.file_url,
    }));

  // Checklist-based missing
  const phase = tx.phase || 1;
  const checklistMissing = isClosed ? [] : checklist
    .filter(item => item.required && item.status === "missing" && (item.required_by_phase || 99) <= phase)
    .map(item => ({
      type:     item.doc_type,
      label:    item.label || item.doc_type,
      required: true,
      source:   "checklist",
    }));

  // Merge and deduplicate
  const allMissing = [...missingDocuments];
  for (const c of checklistMissing) {
    if (!allMissing.find(m => m.type === c.type)) {
      allMissing.push(c);
    }
  }

  return {
    requiredDocuments: requiredTypes.map(type => ({
      type,
      label:    DOC_LABELS[type] || type,
      uploaded: uploadedTypes.has(type),
    })),
    uploadedDocuments: uploadedDocs,
    missingDocuments:  allMissing,
    missingCount:      allMissing.length,
    uploadedCount:     uploadedDocs.length,
  };
}