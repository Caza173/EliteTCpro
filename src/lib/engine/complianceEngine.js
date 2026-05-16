/**
 * EliteTC Compliance Engine
 * Deterministic rule-based compliance checks — NO AI.
 * AI may only summarize the OUTPUT of this engine.
 */

import { CLOSED_STATUSES } from "./constants.js";
import { getDaysUntil } from "./deadlineEngine.js";

/**
 * Run all deterministic compliance checks.
 * @param {object} tx - Transaction record
 * @param {array}  checklistItems - DocumentChecklistItem records
 * @param {array}  complianceReports - ComplianceReport records (AI scan results stored in DB)
 * @param {array}  txTasks - TransactionTask records
 * @returns {ComplianceResult}
 */
export function buildCompliance(tx, checklistItems = [], complianceReports = [], txTasks = []) {
  const issues = [];
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());

  // Closed transactions have no compliance issues
  if (isClosed) {
    return { issues: [], blockerCount: 0, warningCount: 0, infoCount: 0, isCompliant: true };
  }

  const seen = new Set();
  const add = (issue) => {
    if (!seen.has(issue.id)) {
      seen.add(issue.id);
      issues.push(issue);
    }
  };

  // ── Rule 1: Lead Paint Disclosure ─────────────────────────────────────────
  const propType  = (tx.property_type || "").toLowerCase();
  const yearBuilt = tx.year_built ? Number(tx.year_built) : null;
  if (propType !== "land" && yearBuilt && yearBuilt <= 1978) {
    if (!tx.lead_paint_flag) {
      add({
        id:       "lead_paint_disclosure_required",
        rule:     "lead_paint",
        severity: "blocker",
        category: "compliance",
        message:  `Lead-Based Paint Disclosure required (built ${yearBuilt}, pre-1978).`,
        source:   "rules_engine",
      });
    }
  }

  // ── Rule 2: Missing contract date ─────────────────────────────────────────
  if (!tx.contract_date) {
    add({
      id:       "missing_contract_date",
      rule:     "contract_date",
      severity: "warning",
      category: "compliance",
      message:  "Contract/acceptance date is not set.",
      source:   "rules_engine",
    });
  }

  // ── Rule 3: Missing closing date ──────────────────────────────────────────
  if (!tx.closing_date) {
    add({
      id:       "missing_closing_date",
      rule:     "closing_date",
      severity: "warning",
      category: "compliance",
      message:  "Closing date is not set.",
      source:   "rules_engine",
    });
  }

  // ── Rule 4: Missing agent info ────────────────────────────────────────────
  if (!tx.agent && !tx.agent_email) {
    add({
      id:       "missing_agent_info",
      rule:     "agent_info",
      severity: "warning",
      category: "compliance",
      message:  "Agent name/email not assigned to this transaction.",
      source:   "rules_engine",
    });
  }

  // ── Rule 5: Earnest money check ───────────────────────────────────────────
  if (tx.earnest_money_deadline && !tx.earnest_money_received) {
    const days = getDaysUntil(tx.earnest_money_deadline);
    if (days !== null && days < 0) {
      add({
        id:       "emd_not_received_overdue",
        rule:     "emd_received",
        severity: "blocker",
        category: "compliance",
        message:  "Earnest money deposit is overdue and not marked received.",
        source:   "rules_engine",
      });
    }
  }

  // ── Rule 6: Financing contingency ─────────────────────────────────────────
  if (!tx.is_cash_transaction && tx.financing_deadline) {
    const days = getDaysUntil(tx.financing_deadline);
    if (days !== null && days < 0 && !(tx.completed_deadlines || []).includes("financing_deadline")) {
      add({
        id:       "financing_contingency_overdue",
        rule:     "financing_contingency",
        severity: "blocker",
        category: "compliance",
        message:  "Financing commitment deadline is overdue.",
        source:   "rules_engine",
      });
    }
  }

  // ── Rule 7: Inspection scheduled after deadline ───────────────────────────
  const inspDeadlineCompleted = (tx.completed_deadlines || []).includes("inspection_deadline");
  if (tx.inspection_deadline && tx.inspection_scheduled && !tx.inspection_completed && !inspDeadlineCompleted) {
    const scheduledDay = new Date(new Date(tx.inspection_scheduled).toDateString());
    const deadlineDay  = new Date(new Date(tx.inspection_deadline).toDateString());
    if (scheduledDay > deadlineDay) {
      add({
        id:       "inspection_scheduled_after_deadline",
        rule:     "inspection_timing",
        severity: "blocker",
        category: "compliance",
        message:  `Inspection scheduled (${new Date(tx.inspection_scheduled).toLocaleDateString()}) is AFTER the contractual deadline (${new Date(tx.inspection_deadline).toLocaleDateString()}).`,
        source:   "rules_engine",
      });
    }
  }

  // ── Rule 8: Inspection scheduled but not marked complete ─────────────────
  if (tx.inspection_scheduled && new Date(tx.inspection_scheduled) < new Date() && !tx.inspection_completed && !inspDeadlineCompleted) {
    add({
      id:       "inspection_not_marked_complete",
      rule:     "inspection_status",
      severity: "warning",
      category: "workflow",
      message:  `Inspection was scheduled for ${new Date(tx.inspection_scheduled).toLocaleString()} but not marked complete.`,
      source:   "rules_engine",
    });
  }

  // ── Rule 9: Required checklist documents ──────────────────────────────────
  const phase = tx.phase || 1;
  for (const item of checklistItems) {
    if (item.required && item.status === "missing" && (item.required_by_phase || 99) <= phase) {
      add({
        id:       `missing_doc_checklist_${item.id}`,
        rule:     "required_document",
        severity: "blocker",
        category: "documents",
        message:  `Required document missing: ${item.label || item.doc_type || "Unknown document"}.`,
        documentRef: item.doc_type || null,
        source:   "checklist",
      });
    }
  }

  // ── Rule 10: Stored compliance report blockers (AI-scanned, stored in DB) ─
  // These are pre-computed AI results stored as structured data in ComplianceReport.
  // We treat them as deterministic inputs since they're DB records, not live AI calls.
  for (const report of complianceReports) {
    for (const blocker of (report.blockers || [])) {
      // Skip signature/initials — handled by SignatureRequest system
      const msg = (blocker.message || "").toLowerCase();
      if (msg.includes("signature") || msg.includes("initials")) continue;

      add({
        id:          `compliance_report_${report.id}_${blocker.id || msg.slice(0, 20)}`,
        rule:        "compliance_report_blocker",
        severity:    "blocker",
        category:    "compliance",
        message:     blocker.message,
        documentRef: report.document_name,
        source:      "compliance_report",
      });
    }
  }

  const blockerCount = issues.filter(i => i.severity === "blocker").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount    = issues.filter(i => i.severity === "info").length;

  // Sort: blockers → warnings → info
  const ORDER = { blocker: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));

  return {
    issues,
    blockerCount,
    warningCount,
    infoCount,
    isCompliant: blockerCount === 0 && warningCount === 0,
  };
}