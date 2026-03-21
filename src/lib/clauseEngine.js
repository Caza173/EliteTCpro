// ─── ELITETC CLAUSE ENGINE ────────────────────────────────────────────────────
// Auto-trigger + Addendum Builder

import { CLAUSE_LIBRARY } from "./clauseLibrary";
import { differenceInDays, parseISO, isValid } from "date-fns";

const DEADLINE_FIELDS = [
  { field: "financing_deadline",     clauseId: "ext_financial_commitment", label: "Financing" },
  { field: "inspection_deadline",    clauseId: "ext_inspection_period",    label: "Inspection" },
  { field: "due_diligence_deadline", clauseId: "ext_due_diligence",        label: "Due Diligence" },
  { field: "closing_date",           clauseId: "ext_closing_date",         label: "Closing Date" },
  { field: "appraisal_deadline",     clauseId: "ext_appraisal_deadline",   label: "Appraisal" },
];

/**
 * getSuggestedClauses(transaction, complianceFlags, options)
 * Returns array of { clauseId, reason, priority } sorted by priority desc
 */
export function getSuggestedClauses(transaction = {}, complianceFlags = [], options = {}) {
  const suggestions = [];
  const now = new Date();

  const add = (clauseId, reason, priority = 1) => {
    if (!suggestions.find(s => s.clauseId === clauseId)) {
      suggestions.push({ clauseId, reason, priority });
    }
  };

  // ── 1. Approaching / overdue deadlines ─────────────────────────────────
  for (const { field, clauseId, label } of DEADLINE_FIELDS) {
    const val = transaction[field];
    if (!val) continue;
    if (field === "financing_deadline" && transaction.is_cash_transaction) continue;
    let date;
    try { date = parseISO(val); } catch { continue; }
    if (!isValid(date)) continue;
    const days = differenceInDays(date, now);
    if (days < 0) add(clauseId, `${label} deadline is overdue (${Math.abs(days)}d ago)`, 10);
    else if (days <= 2) add(clauseId, `${label} deadline is in ${days} day(s) — urgent`, 9);
    else if (days <= 7) add(clauseId, `${label} deadline approaching in ${days} days`, 7);
  }

  // ── 2. Compliance flag–based triggers ──────────────────────────────────
  const flags = complianceFlags.map(f => (f.message || "").toLowerCase());

  const hasFlag = (...keywords) => flags.some(f => keywords.some(k => f.includes(k)));

  if (hasFlag("title","encumbrance","easement","lien")) {
    add("ext_title_resolution",      "Title issue flagged in compliance scan", 8);
    add("marketable_title_cure",     "Title defect may require cure period", 7);
    add("easement_encumbrance_review","Encumbrance review recommended", 6);
  }

  if (hasFlag("appraisal","appraised")) {
    add("appraisal_contingency",     "Appraisal issue flagged", 8);
    add("ext_appraisal_deadline",    "Appraisal deadline may need extension", 7);
  }

  if (hasFlag("inspection","repair","defect","issue")) {
    add("repair_request",            "Inspection issues flagged — repair request recommended", 8);
    add("buyer_credit_repairs",      "Credit in lieu of repairs may be appropriate", 7);
    add("repair_escrow_holdback",    "Consider escrow holdback for unresolved repairs", 5);
  }

  if (hasFlag("signature","unsigned","missing signature")) {
    add("entire_agreement",          "Agreement may require re-execution clarification", 4);
  }

  if (hasFlag("financing","commitment","lender","loan")) {
    add("ext_financial_commitment",  "Financing issue requires attention", 8);
  }

  // ── 3. Transaction-field–based triggers ────────────────────────────────
  // Fuel proration
  if (transaction.property_type === "residential" || transaction.property_type === "multi_family") {
    add("fuel_proration", "Fuel proration recommended for residential property", 3);
  }

  // Buyer selling property
  if (options.buyerSellingProperty) {
    add("sale_of_buyers_property",     "Buyer is selling their current property", 6);
    add("buyer_home_under_contract",   "Buyer property may be under contract", 5);
  }

  // Post-closing occupancy
  if (options.postClosingOccupancy) {
    add("post_closing_occupancy", "Post-closing occupancy requested", 7);
    add("rent_back_agreement",    "Rent-back may be appropriate", 6);
    add("hold_harmless",          "Hold harmless recommended for occupancy period", 5);
  }

  // Pre-closing occupancy
  if (options.preClosingOccupancy) {
    add("pre_closing_occupancy", "Pre-closing occupancy requested", 7);
    add("hold_harmless",         "Hold harmless recommended for occupancy period", 5);
  }

  // Condo/HOA
  if (transaction.property_type === "condo") {
    add("board_approval_contingency", "Condo purchase may require board approval", 6);
  }

  // Missing earnest money
  if (!transaction.earnest_money_deadline) {
    add("deposit_increase", "No earnest money deadline set — review deposit terms", 3);
  }

  // Sort by priority descending
  suggestions.sort((a, b) => b.priority - a.priority);

  // Enrich with clause data
  return suggestions.map(s => ({
    ...s,
    clause: CLAUSE_LIBRARY.find(c => c.id === s.clauseId),
  })).filter(s => s.clause);
}

/**
 * buildAddendum(transaction, selectedClauses, inputs)
 * Returns formatted NH-compliant addendum text
 *
 * @param {object} transaction - Transaction record
 * @param {string[]} selectedClauses - Array of clause IDs in order
 * @param {object} inputs - { [clauseId]: { [key]: value } }
 * @returns {{ text: string, html: string }}
 */
export function buildAddendum(transaction, selectedClauses, inputs = {}) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const buyer = transaction.buyers?.join(" and ") || transaction.buyer || "[Buyer Name]";
  const seller = transaction.sellers?.join(" and ") || transaction.seller || "[Seller Name]";
  const address = transaction.address || "[Property Address]";
  const effectiveDate = transaction.contract_date
    ? new Date(transaction.contract_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "[Contract Date]";

  const lines = [];

  lines.push("ADDENDUM TO PURCHASE AND SALES AGREEMENT");
  lines.push("");
  lines.push(`This Addendum is made part of the Purchase and Sales Agreement dated ${effectiveDate}`);
  lines.push(`between ${buyer} ("Buyer") and ${seller} ("Seller")`);
  lines.push(`for the property located at ${address}.`);
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");

  let clauseNum = 1;
  for (const clauseId of selectedClauses) {
    const clause = CLAUSE_LIBRARY.find(c => c.id === clauseId);
    if (!clause) continue;

    const clauseInputs = inputs[clauseId] || {};
    let body = clause.bodyTemplate;

    // Replace placeholders
    for (const [key, value] of Object.entries(clauseInputs)) {
      body = body.replace(new RegExp(`\\[${key}\\]`, "g"), value || `[${key}]`);
    }

    // Auto-fill from transaction where possible
    body = body
      .replace(/\[buyer_name\]/gi, buyer)
      .replace(/\[seller_name\]/gi, seller)
      .replace(/\[property_address\]/gi, address)
      .replace(/\[effective_date\]/gi, effectiveDate);

    lines.push(`${clauseNum}. ${clause.name.toUpperCase()}`);
    lines.push("");
    lines.push(body);
    lines.push("");
    lines.push("─".repeat(60));
    lines.push("");
    clauseNum++;
  }

  lines.push("All other terms of the Agreement remain in full force and effect.");
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");
  lines.push("SIGNATURES");
  lines.push("");
  lines.push(`Buyer:  ___________________________________  Date: ___________`);
  lines.push(`        ${buyer}`);
  lines.push("");
  lines.push(`Buyer:  ___________________________________  Date: ___________`);
  lines.push(`        (If applicable)`);
  lines.push("");
  lines.push(`Seller: ___________________________________  Date: ___________`);
  lines.push(`        ${seller}`);
  lines.push("");
  lines.push(`Seller: ___________________________________  Date: ___________`);
  lines.push(`        (If applicable)`);
  lines.push("");
  lines.push(`Transaction Coordinator: _______________________  Date: ______`);
  lines.push("");
  lines.push(`Generated by EliteTC on ${today}`);

  const text = lines.join("\n");

  // HTML version
  const htmlLines = lines.map(l => {
    if (l === "─".repeat(60)) return `<hr style="border:0;border-top:1px solid #e2e8f0;margin:12px 0;" />`;
    if (l === "") return `<br/>`;
    if (l === "ADDENDUM TO PURCHASE AND SALES AGREEMENT" || l === "SIGNATURES")
      return `<h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">${l}</h2>`;
    if (l.match(/^\d+\. [A-Z ]+$/))
      return `<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;">${l}</h3>`;
    return `<p style="font-size:13px;line-height:1.7;margin:0 0 2px;">${l}</p>`;
  });

  const html = `<div style="font-family:-apple-system,sans-serif;max-width:760px;padding:24px;line-height:1.7;">${htmlLines.join("")}</div>`;

  return { text, html };
}

/**
 * fillFromTransaction(clause, transaction)
 * Pre-populates input defaults from the transaction object
 */
export function fillFromTransaction(clause, transaction) {
  const prefill = {};
  const fieldMap = {
    new_date:              null, // will be set per clause
    inspection_deadline:   transaction.inspection_deadline,
    appraisal_deadline:    transaction.appraisal_deadline,
    financing_deadline:    transaction.financing_deadline,
    due_diligence_deadline:transaction.due_diligence_deadline,
    closing_date:          transaction.closing_date,
    inspector_name:        transaction.inspector_name,
    escrow_agent:          transaction.closing_title_company || transaction.attorney_name,
    attorney_name:         transaction.attorney_name,
    buyers_property_address: "",
  };
  for (const input of clause.requiredInputs) {
    if (fieldMap[input.key] !== undefined && fieldMap[input.key] !== null) {
      prefill[input.key] = fieldMap[input.key];
    }
  }
  return prefill;
}