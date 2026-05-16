/**
 * EliteTC Transaction Insights Builder
 * =====================================
 * THE SINGLE SOURCE OF TRUTH for all transaction intelligence.
 *
 * ALL dashboards, alerts, AI summaries, notifications, and compliance systems
 * MUST use this function. No direct transaction logic in components.
 *
 * AI may ONLY summarize/explain the output of this function.
 * AI must NEVER be the source of truth.
 *
 * Usage:
 *   const insights = buildTransactionInsights(tx, { tasks, checklist, documents, complianceReports })
 */

import { buildDeadlines }            from "./deadlineEngine.js";
import { buildCompliance }           from "./complianceEngine.js";
import { buildDocumentRequirements } from "./documentEngine.js";
import { buildRiskProfile }          from "./riskEngine.js";
import { buildPhaseState }           from "./phaseEngine.js";
import { CLOSED_STATUSES }           from "./constants.js";

/**
 * Build the complete Transaction Insights object.
 *
 * @param {object} tx                   - Transaction record from DB
 * @param {object} context              - Supporting data
 * @param {array}  context.tasks        - TransactionTask[]
 * @param {array}  context.checklist    - DocumentChecklistItem[]
 * @param {array}  context.documents    - Document[]
 * @param {array}  context.complianceReports - ComplianceReport[]
 * @returns {TransactionInsights}
 */
export function buildTransactionInsights(tx, {
  tasks             = [],
  checklist         = [],
  documents         = [],
  complianceReports = [],
} = {}) {
  if (!tx || !tx.id) {
    throw new Error("buildTransactionInsights: tx with id is required.");
  }

  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());

  // ── 1. Run all sub-engines ────────────────────────────────────────────────
  const deadlines  = buildDeadlines(tx);
  const compliance = buildCompliance(tx, checklist, complianceReports, tasks);
  const docs       = buildDocumentRequirements(tx, documents, checklist);
  const risk       = buildRiskProfile(tx, deadlines, compliance, docs);
  const phase      = buildPhaseState(tx, tasks, deadlines);

  // ── 2. EMD Status ─────────────────────────────────────────────────────────
  let emdStatus = "not_applicable";
  if (tx.earnest_money_deadline) {
    if (tx.earnest_money_received) {
      emdStatus = "received";
    } else {
      const emdDeadline = deadlines.all?.find(d => d.type === "earnest_money");
      emdStatus = emdDeadline?.status === "overdue" ? "overdue" : "pending";
    }
  }

  // ── 3. Financing status ───────────────────────────────────────────────────
  let financingStatus = "not_applicable";
  if (!tx.is_cash_transaction) {
    const fin = deadlines.all?.find(d => d.type === "financing");
    if (fin) {
      if ((tx.completed_deadlines || []).includes("financing_deadline")) financingStatus = "committed";
      else if (fin.status === "overdue") financingStatus = "overdue";
      else if (fin.alertLevel !== "none") financingStatus = "pending_urgent";
      else financingStatus = "pending";
    } else {
      financingStatus = "no_deadline_set";
    }
  } else {
    financingStatus = "cash_transaction";
  }

  // ── 4. Inspection status ──────────────────────────────────────────────────
  let inspectionStatus = "not_scheduled";
  if (tx.inspection_completed) {
    inspectionStatus = "completed";
  } else if (tx.inspection_scheduled) {
    const now = new Date();
    inspectionStatus = new Date(tx.inspection_scheduled) > now ? "scheduled" : "pending_completion";
  } else if (tx.inspection_deadline) {
    const insp = deadlines.all?.find(d => d.type === "inspection");
    if (insp?.status === "overdue") inspectionStatus = "overdue";
    else inspectionStatus = "not_scheduled";
  }

  // ── 5. Build unified alerts ───────────────────────────────────────────────
  const alerts = buildAlerts(deadlines, compliance, docs, risk, isClosed);

  // ── 6. Assemble final insights object ─────────────────────────────────────
  return {
    transactionId:      tx.id,
    address:            tx.address,
    status:             tx.status,
    isClosed,

    // Phase
    phase:              phase.currentPhase,
    phaseLabel:         phase.currentPhaseLabel,
    phaseProgress:      phase.phaseProgress,
    taskCompletionPct:  phase.taskCompletionPct,
    nextAction:         phase.nextAction,
    blockedPhases:      phase.blockedPhases,

    // Deadlines
    daysUntilClosing:      deadlines.daysUntilClosing,
    isClosingSoon:         deadlines.isClosingSoon,
    overdueDeadlines:      deadlines.overdueDeadlines,
    upcomingDeadlines:     deadlines.upcomingDeadlines,
    criticalDeadlines:     deadlines.criticalDeadlines,
    nextCriticalDeadline:  deadlines.nextCriticalDeadline,
    allDeadlines:          deadlines.all,

    // Documents
    missingDocuments:  docs.missingDocuments,
    uploadedDocuments: docs.uploadedDocuments,
    requiredDocuments: docs.requiredDocuments,
    missingDocCount:   docs.missingCount,

    // Compliance
    complianceIssues:  compliance.issues,
    complianceIsCompliant: compliance.isCompliant,
    blockerCount:      compliance.blockerCount,
    warningCount:      compliance.warningCount,

    // Statuses
    emdStatus,
    financingStatus,
    inspectionStatus,

    // Risk
    riskLevel:   risk.riskLevel,
    riskScore:   risk.riskScore,
    riskFactors: risk.riskFactors,

    // Alerts (unified)
    alerts,

    // Metadata
    generatedAt: new Date().toISOString(),

    // Raw engine outputs (for diagnostics/debugging)
    _engines: { deadlines, compliance, docs, risk, phase },
  };
}

// ─── Alert Builder ────────────────────────────────────────────────────────────

function buildAlerts(deadlines, compliance, docs, risk, isClosed) {
  if (isClosed) return [];

  const alerts = [];

  // Overdue deadline alerts
  for (const d of deadlines.overdueDeadlines || []) {
    alerts.push({
      id:       `deadline_overdue_${d.key}`,
      type:     "deadline_critical",
      severity: "high",
      message:  `${d.label} was missed — ${new Date(d.date).toLocaleDateString()}.`,
      deadline: d.date,
      source:   "deadline_engine",
    });
  }

  // Critical deadline alerts
  for (const d of deadlines.criticalDeadlines || []) {
    alerts.push({
      id:       `deadline_critical_${d.key}`,
      type:     "deadline_critical",
      severity: "high",
      message:  `${d.label} is ${d.displayLabel}.`,
      deadline: d.date,
      source:   "deadline_engine",
    });
  }

  // Upcoming deadline warnings
  for (const d of deadlines.upcomingDeadlines || []) {
    alerts.push({
      id:       `deadline_warning_${d.key}`,
      type:     "deadline_warning",
      severity: "medium",
      message:  `${d.label} — ${d.displayLabel}.`,
      deadline: d.date,
      source:   "deadline_engine",
    });
  }

  // Compliance blocker alerts
  for (const issue of compliance.issues || []) {
    if (issue.severity === "blocker") {
      alerts.push({
        id:          `compliance_${issue.id}`,
        type:        "compliance_issue",
        severity:    "high",
        message:     issue.message,
        documentRef: issue.documentRef || null,
        source:      "compliance_engine",
      });
    }
  }

  // Missing document alerts
  for (const doc of docs.missingDocuments || []) {
    alerts.push({
      id:       `missing_doc_${doc.type}`,
      type:     "compliance_issue",
      severity: "high",
      message:  `Required document missing: ${doc.label}.`,
      source:   "document_engine",
    });
  }

  // Risk factor alerts
  if (risk.riskLevel === "critical") {
    alerts.push({
      id:       "risk_critical",
      type:     "risk_alert",
      severity: "high",
      message:  `Transaction risk level is CRITICAL (score: ${risk.riskScore}).`,
      source:   "risk_engine",
    });
  }

  // Deduplicate by id
  const seen = new Set();
  return alerts.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}