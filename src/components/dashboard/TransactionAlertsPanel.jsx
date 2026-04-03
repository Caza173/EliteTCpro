import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, AlertCircle, Clock, ListX, Zap, X, CheckCircle2, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../auth/useCurrentUser";

const ALERT_CONFIG = {
  deadline_overdue:     { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    label: "Overdue" },
  deadline_approaching: { icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  label: "Deadline" },
  tasks_overdue:        { icon: ListX,         color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Tasks" },
  closing_risk:         { icon: Zap,           color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    label: "Closing Risk" },
  missing_documents:    { icon: AlertCircle,   color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Documents" },
  compliance_blockers:  { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    label: "Compliance" },
};

const PRIORITY_BADGE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning:  "bg-amber-100 text-amber-700 border-amber-200",
  info:     "bg-blue-100 text-blue-700 border-blue-200",
};

export default function TransactionAlertsPanel({ brokerageId }) {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // Fetch active alerts from database
  const { data: dbAlerts = [], isLoading } = useQuery({
    queryKey: ["monitorAlerts", brokerageId],
    queryFn: () => base44.entities.MonitorAlert.filter({ brokerage_id: brokerageId, status: "open" }),
    enabled: !!brokerageId,
  });

  // Update alert status (resolve or dismiss)
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status }) =>
      base44.entities.MonitorAlert.update(alertId, {
        status,
        ...(status === "dismissed" ? { dismissed_at: new Date().toISOString() } : {}),
        ...(status === "resolved"  ? { resolved_at:  new Date().toISOString() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitorAlerts", brokerageId] });
    },
  });

  const handleDismiss = async (e, alert) => {
    e.preventDefault();
    e.stopPropagation();
    updateAlertMutation.mutate({ alertId: alert.id, status: "dismissed" });
  };

  const handleResolved = async (e, alert) => {
    e.preventDefault();
    e.stopPropagation();
    updateAlertMutation.mutate({ alertId: alert.id, status: "resolved" });
  };

  const filtered = filter === "all" ? dbAlerts : dbAlerts.filter(a => a.priority === filter);
  const critCount = dbAlerts.filter(a => a.priority === "critical").length;
  const warnCount = dbAlerts.filter(a => a.priority === "warning").length;
  const infoCount = dbAlerts.filter(a => a.priority === "info").length;
  const totalCount = dbAlerts.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Transaction Alerts</span>
        {totalCount > 0 && (
          <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">{totalCount}</Badge>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all",      label: "All",      count: totalCount },
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

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
          <p className="text-xs text-gray-400">Loading alerts...</p>
        </div>
      ) : filtered.length === 0 ? (
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
            const cfg = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.deadline_approaching;
            const Icon = cfg.icon;
            return (
              <Link
                key={alert.id}
                to={`${createPageUrl("TransactionDetail")}?id=${alert.transaction_id}`}
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
                  <p className="text-[11px] text-blue-600 mt-0.5 truncate">{alert.transaction_address}</p>
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-1 flex-shrink-0 ml-1" onClick={e => e.preventDefault()}>
                  <button
                    onClick={(e) => handleResolved(e, alert)}
                    disabled={updateAlertMutation.isPending}
                    title="Mark resolved"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors disabled:opacity-50"
                  >
                    {updateAlertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Resolved
                  </button>
                  <button
                    onClick={(e) => handleDismiss(e, alert)}
                    disabled={updateAlertMutation.isPending}
                    title="Dismiss alert"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}