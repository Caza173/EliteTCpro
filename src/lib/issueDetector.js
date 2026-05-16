/**
 * issueDetector.js — BACKWARD COMPATIBILITY SHIM
 *
 * This module now delegates to the centralized Transaction Intelligence Engine.
 * The engine (lib/engine/) is the single source of truth.
 *
 * Components that import `detectIssues` from here still work,
 * but the actual logic lives in lib/engine/complianceEngine.js
 * and lib/engine/deadlineEngine.js.
 *
 * Prefer importing `useTransactionInsights` hook for new code.
 */

import { buildTransactionInsights } from "@/lib/engine/index.js";

/**
 * @deprecated Use useTransactionInsights() hook instead.
 * Kept for backward compatibility with IssueDetectionPanel and other components.
 */
export function detectIssues(transaction, checklistItems = [], complianceReports = [], txTasks = []) {
  if (!transaction?.id) return [];

  const insights = buildTransactionInsights(transaction, {
    tasks: txTasks,
    checklist: checklistItems,
    documents: [],
    complianceReports,
  });

  // Map engine alerts → legacy issue format
  return (insights.alerts || []).map(alert => ({
    id:              alert.id,
    key:             alert.id,
    issue_type:      alert.type,
    severity:        alert.severity === "high" ? "high" : alert.severity === "medium" ? "medium" : "low",
    description:     alert.message,
    deadline:        alert.deadline || null,
    deadline_label:  null,
    document_reference: alert.documentRef || null,
  }));
}

export const ISSUE_TYPE_LABELS = {
  compliance_issue:    "Compliance",
  deadline_warning:    "Deadline Warning",
  deadline_critical:   "Deadline Critical",
  workflow_incomplete: "Workflow",
  risk_alert:          "Risk Alert",
};

export const SEVERITY_STYLES = {
  high:   {
    badge: "text-red-400 border-red-500/30",
    dot:   "bg-red-500",
    row:   "border-red-500/15",
  },
  medium: {
    badge: "text-[#d2a35f] border-[rgba(210,163,95,0.3)]",
    dot:   "bg-[#d2a35f]",
    row:   "border-[rgba(210,163,95,0.15)]",
  },
  low: {
    badge: "text-blue-400 border-blue-500/30",
    dot:   "bg-blue-400",
    row:   "border-blue-500/15",
  },
};