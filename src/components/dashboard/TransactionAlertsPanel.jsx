import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, AlertCircle, Info, Clock, FileX, ShieldAlert, ListX, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO, isValid } from "date-fns";

const DEADLINE_FIELDS = [
  { field: "earnest_money_deadline", label: "Earnest Money Deposit" },
  { field: "inspection_deadline",    label: "Inspection Deadline" },
  { field: "due_diligence_deadline", label: "Due Diligence" },
  { field: "appraisal_deadline",     label: "Appraisal Deadline" },
  { field: "financing_deadline",     label: "Financing Commitment" },
  { field: "closing_date",           label: "Closing Date" },
  { field: "ctc_target",             label: "Clear to Close" },
];

const ALERT_CONFIG = {
  deadline_overdue:     { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    label: "Overdue" },
  deadline_approaching: { icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  label: "Deadline" },
  tasks_overdue:        { icon: ListX,         color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Tasks" },
  closing_risk:         { icon: Zap,           color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    label: "Closing Risk" },
};

const PRIORITY_BADGE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning:  "bg-amber-100 text-amber-700 border-amber-200",
  info:     "bg-blue-100 text-blue-700 border-blue-200",
};

function computeAlerts(transactions) {
  const alerts = [];
  const today = new Date();

  for (const tx of transactions) {
    if (tx.status === "closed" || tx.status === "cancelled") continue;

    // 1. Deadline alerts
    for (const { field, label } of DEADLINE_FIELDS) {
      if (!tx[field]) continue;
      let deadlineDate;
      try { deadlineDate = parseISO(tx[field]); } catch { continue; }
      if (!isValid(deadlineDate)) continue;
      const daysLeft = differenceInDays(deadlineDate, today);

      if (daysLeft < 0 && field !== "closing_date") {
        alerts.push({
          id: `${tx.id}-overdue-${field}`,
          priority: "critical",
          type: "deadline_overdue",
          message: `${label} was ${Math.abs(daysLeft)} day(s) ago`,
          address: tx.address,
          txId: tx.id,
        });
      } else if (daysLeft >= 0 && daysLeft <= 7) {
        const priority = daysLeft <= 2 ? "critical" : daysLeft <= 4 ? "warning" : "info";
        alerts.push({
          id: `${tx.id}-approaching-${field}`,
          priority,
          type: "deadline_approaching",
          message: daysLeft === 0 ? `${label} is TODAY` : `${label} in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          address: tx.address,
          txId: tx.id,
        });
      }
    }

    // 2. Overdue tasks
    const overdue = (tx.tasks || []).filter(t => !t.completed && t.due_date && new Date(t.due_date) < today);
    if (overdue.length > 0) {
      alerts.push({
        id: `${tx.id}-tasks-overdue`,
        priority: "warning",
        type: "tasks_overdue",
        message: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}: ${overdue.slice(0, 2).map(t => t.name).join(", ")}${overdue.length > 2 ? "…" : ""}`,
        address: tx.address,
        txId: tx.id,
      });
    }

    // 3. Closing risk (closing within 7 days + incomplete tasks)
    if (tx.closing_date) {
      let closingDate;
      try { closingDate = parseISO(tx.closing_date); } catch { continue; }
      if (!isValid(closingDate)) continue;
      const daysToClose = differenceInDays(closingDate, today);
      const incomplete = (tx.tasks || []).filter(t => !t.completed);
      if (daysToClose >= 0 && daysToClose <= 7 && incomplete.length > 0) {
        alerts.push({
          id: `${tx.id}-closing-risk`,
          priority: "critical",
          type: "closing_risk",
          message: `Closing ${daysToClose === 0 ? "TODAY" : `in ${daysToClose}d`} — ${incomplete.length} incomplete task${incomplete.length > 1 ? "s" : ""}`,
          address: tx.address,
          txId: tx.id,
        });
      }
    }
  }

  // Sort: critical first
  const ORDER = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => (ORDER[a.priority] ?? 2) - (ORDER[b.priority] ?? 2));
}

export default function TransactionAlertsPanel({ transactions = [] }) {
  const [filter, setFilter] = useState("all");

  const alerts = useMemo(() => computeAlerts(transactions), [transactions]);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.priority === filter);
  const critCount = alerts.filter(a => a.priority === "critical").length;
  const warnCount = alerts.filter(a => a.priority === "warning").length;
  const infoCount = alerts.filter(a => a.priority === "info").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Transaction Alerts</span>
        {alerts.length > 0 && (
          <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">{alerts.length}</Badge>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all",      label: "All",      count: alerts.length },
          { key: "critical", label: "Critical", count: critCount },
          { key: "warning",  label: "Warning",  count: warnCount },
          { key: "info",     label: "Info",     count: infoCount },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
              filter === key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}{count > 0 ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-green-700">
            {filter === "all" ? "No open alerts" : `No ${filter} alerts`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">All transactions look good</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
          {filtered.map((alert) => {
            const cfg = ALERT_CONFIG[alert.type] || ALERT_CONFIG.deadline_approaching;
            const Icon = cfg.icon;
            return (
              <Link
                key={alert.id}
                to={`${createPageUrl("TransactionDetail")}?id=${alert.txId}`}
                className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border} hover:opacity-90 transition-opacity`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE[alert.priority]}`}>
                      {alert.priority}
                    </Badge>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                  </div>
                  <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{alert.message}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5 truncate">{alert.address}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}