import React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RISK_RULES = [
  {
    id: "inspection_missing",
    deadline_field: "inspection_deadline",
    label: "Inspection deadline approaching",
    condition: (tx, checklist) => {
      const insp = checklist.find(
        (c) => c.transaction_id === tx.id && c.doc_type === "inspection" && c.status === "missing"
      );
      return !!insp;
    },
    message: "Inspection report not yet uploaded",
    severity: "high",
  },
  {
    id: "appraisal_missing",
    deadline_field: "appraisal_deadline",
    label: "Appraisal deadline approaching",
    condition: (tx, checklist) => {
      const appr = checklist.find(
        (c) => c.transaction_id === tx.id && c.doc_type === "appraisal" && c.status === "missing"
      );
      return !!appr;
    },
    message: "Appraisal document not yet uploaded",
    severity: "high",
  },
  {
    id: "financing_no_lender",
    deadline_field: "financing_deadline",
    label: "Finance contingency approaching",
    condition: (tx) => !tx.is_cash_transaction,
    message: "Verify lender commitment is in progress",
    severity: "medium",
  },
  {
    id: "closing_docs_missing",
    deadline_field: "closing_date",
    label: "Closing date approaching",
    condition: (tx, checklist) => {
      const missing = checklist.filter(
        (c) => c.transaction_id === tx.id && c.required && c.status === "missing"
      );
      return missing.length > 0;
    },
    message: "Required documents are still missing before closing",
    severity: "high",
  },
];

const SEVERITY_STYLES = {
  high: { badge: "bg-red-100 text-red-700", icon: "text-red-500", bg: "bg-red-50 border-red-100" },
  medium: { badge: "bg-amber-100 text-amber-700", icon: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
};

// Threshold: only flag if deadline is within 7 days
const WARN_DAYS = 7;

export default function DeadlineRiskPanel({ transactions = [], checklistItems = [] }) {
  const risks = [];

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;

    RISK_RULES.forEach((rule) => {
      const dateStr = tx[rule.deadline_field];
      if (!dateStr) return;

      const days = differenceInCalendarDays(parseISO(dateStr), new Date());
      if (days > WARN_DAYS || days < 0) return; // Only upcoming deadlines within 7 days

      const triggered = rule.condition(tx, checklistItems);
      if (!triggered) return;

      risks.push({
        key: `${tx.id}-${rule.id}`,
        address: tx.address,
        label: rule.label,
        message: rule.message,
        days,
        severity: rule.severity,
      });
    });
  });

  if (risks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-semibold text-gray-800">Deadline Risk Alerts</h3>
        <Badge className="bg-red-100 text-red-700 text-xs">{risks.length}</Badge>
      </div>
      {risks.map((risk) => {
        const s = SEVERITY_STYLES[risk.severity];
        return (
          <div
            key={risk.key}
            className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg}`}
          >
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{risk.address}</p>
              <p className="text-xs text-gray-600 font-medium">{risk.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{risk.message}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <Badge className={`text-xs ${s.badge}`}>
                {risk.days === 0 ? "Today" : `${risk.days}d`}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}