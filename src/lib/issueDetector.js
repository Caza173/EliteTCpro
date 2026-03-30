/**
 * issueDetector.js
 * Scans a transaction + related data and returns structured issue objects.
 * Issue types: compliance_issue | deadline_warning | deadline_critical | workflow_incomplete
 * Severity: low | medium | high
 */

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline",  label: "Earnest Money Deposit" },
  { key: "inspection_deadline",     label: "Inspection Deadline" },
  { key: "due_diligence_deadline",  label: "Due Diligence Deadline" },
  { key: "financing_deadline",      label: "Financing Commitment" },
  { key: "appraisal_deadline",      label: "Appraisal Deadline" },
  { key: "closing_date",            label: "Closing Date" },
  { key: "ctc_target",              label: "Clear to Close Target" },
];

function hoursUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return diff / (1000 * 60 * 60);
}

/**
 * Main scanner — returns array of issue objects.
 * @param {object} transaction
 * @param {array}  checklistItems
 * @param {array}  complianceReports
 * @param {array}  txTasks
 */
export function detectIssues(transaction, checklistItems = [], complianceReports = [], txTasks = []) {
  const issues = [];
  const seen = new Set(); // dedup by key

  const add = (issue) => {
    if (!seen.has(issue.key)) {
      seen.add(issue.key);
      issues.push({ id: issue.key, ...issue });
    }
  };

  // ── 1. DEADLINE CHECKS ────────────────────────────────────────────────────
  for (const { key, label } of DEADLINE_FIELDS) {
    const dateStr = transaction[key];
    if (!dateStr) continue;
    const hours = hoursUntil(dateStr);

    if (hours < 0) {
      add({
        key: `deadline_missed_${key}`,
        issue_type: "deadline_critical",
        severity: "high",
        description: `${label} was missed — ${new Date(dateStr).toLocaleDateString()}.`,
        deadline: dateStr,
        deadline_label: label,
        document_reference: null,
      });
    } else if (hours <= 4) {
      add({
        key: `deadline_4h_${key}`,
        issue_type: "deadline_critical",
        severity: "high",
        description: `${label} is due in less than 4 hours (${new Date(dateStr).toLocaleDateString()}).`,
        deadline: dateStr,
        deadline_label: label,
        document_reference: null,
      });
    } else if (hours <= 12) {
      add({
        key: `deadline_12h_${key}`,
        issue_type: "deadline_warning",
        severity: "medium",
        description: `${label} is due in less than 12 hours (${new Date(dateStr).toLocaleDateString()}).`,
        deadline: dateStr,
        deadline_label: label,
        document_reference: null,
      });
    } else if (hours <= 24) {
      add({
        key: `deadline_24h_${key}`,
        issue_type: "deadline_warning",
        severity: "medium",
        description: `${label} is due within 24 hours (${new Date(dateStr).toLocaleDateString()}).`,
        deadline: dateStr,
        deadline_label: label,
        document_reference: null,
      });
    }
  }

  // ── 2. MISSING REQUIRED DOCUMENTS (from checklist) ────────────────────────
  const phase = transaction.phase || 1;
  for (const item of checklistItems) {
    if (item.required && item.status === "missing" && (item.required_by_phase || 99) <= phase) {
      add({
        key: `missing_doc_${item.id}`,
        issue_type: "compliance_issue",
        severity: "high",
        description: `Required document missing: ${item.label || item.doc_type || "Unknown document"}.`,
        deadline: null,
        deadline_label: null,
        document_reference: item.doc_type || null,
      });
    }
  }

  // ── 3. COMPLIANCE SCAN ISSUES (from ComplianceReport) ─────────────────────
  for (const report of complianceReports) {
    // Missing signatures
    const sigs = report.signatures || {};
    for (const [role, status] of Object.entries(sigs)) {
      if (status === "missing") {
        const roleLabel = { buyer_signature: "Buyer", seller_signature: "Seller", buyer_agent_signature: "Buyer's Agent", seller_agent_signature: "Seller's Agent" }[role] || role;
        add({
          key: `missing_sig_${report.id}_${role}`,
          issue_type: "compliance_issue",
          severity: "high",
          description: `Missing signature: ${roleLabel} has not signed "${report.document_name}".`,
          deadline: null,
          deadline_label: null,
          document_reference: report.document_name,
        });
      }
    }

    // Missing initials pages
    for (const pg of (report.missing_initials_pages || [])) {
      add({
        key: `missing_initials_${report.id}_p${pg}`,
        issue_type: "compliance_issue",
        severity: "medium",
        description: `Missing initials on page ${pg} of "${report.document_name}".`,
        deadline: null,
        deadline_label: null,
        document_reference: report.document_name,
      });
    }

    // Blockers from AI scan
    for (const blocker of (report.blockers || [])) {
      add({
        key: `blocker_${report.id}_${blocker.id || blocker.message?.slice(0, 20)}`,
        issue_type: "compliance_issue",
        severity: "high",
        description: blocker.message,
        deadline: null,
        deadline_label: null,
        document_reference: report.document_name,
      });
    }
  }

  // ── 4. WORKFLOW INCOMPLETE ─────────────────────────────────────────────────
  const currentPhaseTasks = txTasks.filter(t => t.phase === phase && t.is_required && !t.is_completed);
  if (currentPhaseTasks.length > 0) {
    add({
      key: `workflow_incomplete_phase_${phase}`,
      issue_type: "workflow_incomplete",
      severity: "low",
      description: `${currentPhaseTasks.length} required task${currentPhaseTasks.length > 1 ? "s" : ""} incomplete in current phase: ${currentPhaseTasks.slice(0, 2).map(t => t.title).join(", ")}${currentPhaseTasks.length > 2 ? "…" : ""}.`,
      deadline: null,
      deadline_label: null,
      document_reference: null,
    });
  }

  // Sort: high → medium → low
  const ORDER = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export const ISSUE_TYPE_LABELS = {
  compliance_issue:    "Compliance",
  deadline_warning:    "Deadline Warning",
  deadline_critical:   "Deadline Critical",
  workflow_incomplete: "Workflow",
};

export const SEVERITY_STYLES = {
  high:   { badge: "bg-red-50 text-red-700 border-red-200",    dot: "bg-red-500",    row: "border-red-100 bg-red-50/30" },
  medium: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", row: "border-amber-100 bg-amber-50/30" },
  low:    { badge: "bg-blue-50 text-blue-700 border-blue-200",  dot: "bg-blue-500",   row: "border-blue-100 bg-blue-50/20" },
};