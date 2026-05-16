/**
 * EliteTC Risk Engine
 * Deterministic risk scoring based on rules — NO AI.
 * Returns riskLevel and riskFactors for any transaction.
 */

import { RISK_WEIGHTS, CLOSED_STATUSES } from "./constants.js";
import { getDaysUntil } from "./deadlineEngine.js";

/**
 * Compute risk profile from pre-built engine outputs.
 * @param {object} tx         - Transaction record
 * @param {object} deadlines  - Output from buildDeadlines()
 * @param {object} compliance - Output from buildCompliance()
 * @param {object} docs       - Output from buildDocumentRequirements()
 */
export function buildRiskProfile(tx, deadlines, compliance, docs) {
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());
  if (isClosed) {
    return { riskLevel: "low", riskScore: 0, riskFactors: [], isClosed: true };
  }

  let score = 0;
  const factors = [];

  const addFactor = (key, message) => {
    const weight = RISK_WEIGHTS[key] || 5;
    score += weight;
    factors.push({ key, message, weight });
  };

  // ── Deadline-based risks ───────────────────────────────────────────────────

  const closing = (deadlines.all || []).find(d => d.type === "closing");
  if (closing && !closing.completed) {
    if (closing.days !== null && closing.days < 0) {
      addFactor("overdue_closing", "Closing date has passed and transaction is not closed.");
    } else if (closing.days !== null && closing.days <= 2) {
      addFactor("closing_within_48h_no_title", `Closing is in ${closing.days} day(s) — verify all docs are complete.`);
    } else if (closing.days !== null && closing.days <= 30) {
      addFactor("closing_soon_30d", `Closing is in ${closing.days} days.`);
    }
  }

  const financing = (deadlines.all || []).find(d => d.type === "financing");
  if (financing && !financing.completed && financing.days !== null && financing.days < 0 && !tx.is_cash_transaction) {
    addFactor("overdue_financing", "Financing commitment deadline is overdue.");
  }

  const emd = (deadlines.all || []).find(d => d.type === "earnest_money");
  if (emd && !emd.completed && emd.days !== null && emd.days < 0) {
    addFactor("overdue_emd", "Earnest money deposit is overdue and not received.");
  }

  const inspection = (deadlines.all || []).find(d => d.type === "inspection");
  if (inspection && !inspection.completed && inspection.days !== null && inspection.days < 0) {
    addFactor("overdue_inspection", "Inspection deadline has passed.");
  }

  const dd = (deadlines.all || []).find(d => d.type === "due_diligence");
  if (dd && !dd.completed && dd.days !== null && dd.days < 0) {
    addFactor("overdue_due_diligence", "Due diligence deadline has passed.");
  }

  // ── Compliance-based risks ─────────────────────────────────────────────────

  if (compliance.blockerCount > 0) {
    addFactor("missing_psa_signature", `${compliance.blockerCount} compliance blocker(s) detected.`);
  }

  // ── Document-based risks ───────────────────────────────────────────────────

  if (docs.missingCount > 0) {
    const weight = RISK_WEIGHTS.missing_required_doc * Math.min(docs.missingCount, 3);
    score += weight;
    factors.push({
      key:     "missing_required_doc",
      message: `${docs.missingCount} required document(s) missing.`,
      weight,
    });
  }

  // ── Basic data quality ────────────────────────────────────────────────────

  if (!tx.contract_date) {
    addFactor("no_contract_date", "Contract date is not set.");
  }

  // ── Compute risk level ────────────────────────────────────────────────────

  let riskLevel;
  if (score >= 40)      riskLevel = "critical";
  else if (score >= 25) riskLevel = "high";
  else if (score >= 10) riskLevel = "medium";
  else                  riskLevel = "low";

  return {
    riskLevel,
    riskScore: score,
    riskFactors: factors,
    isClosed: false,
  };
}