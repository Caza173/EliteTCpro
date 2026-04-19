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
import { useAccessibleDealIds } from "../../lib/useDealAccess";

const ALERT_CONFIG = {
  deadline_overdue:     { icon: AlertTriangle, iconColor: "var(--danger)",   bgStyle: { backgroundColor: "var(--danger-bg)" },  borderColor: "var(--danger)",   label: "Overdue" },
  deadline_approaching: { icon: Clock,         iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Deadline" },
  tasks_overdue:        { icon: ListX,         iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Tasks" },
  closing_risk:         { icon: Zap,           iconColor: "var(--danger)",   bgStyle: { backgroundColor: "var(--danger-bg)" },  borderColor: "var(--danger)",   label: "Closing Risk" },
  missing_documents:    { icon: AlertCircle,   iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Documents" },
  compliance_blockers:  { icon: AlertTriangle, iconColor: "var(--danger)",   bgStyle: { backgroundColor: "var(--danger-bg)" },  borderColor: "var(--danger)",   label: "Compliance" },
};

const PRIORITY_BADGE_STYLE = {
  critical: { backgroundColor: "var(--danger-bg)",  color: "var(--danger)" },
  warning:  { backgroundColor: "var(--warning-bg)", color: "var(--warning)" },
  info:     { backgroundColor: "var(--accent-subtle)", color: "var(--accent)" },
};

export default function TransactionAlertsPanel({ brokerageId }) {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { accessibleDealIds } = useAccessibleDealIds();

  // Fetch active alerts from database
  const { data: rawAlerts = [], isLoading } = useQuery({
    queryKey: ["monitorAlerts", brokerageId],
    queryFn: () => base44.entities.MonitorAlert.filter({ brokerage_id: brokerageId, status: "open" }),
    enabled: !!brokerageId,
  });

  // Filter alerts to only deals the current user can access
  const dbAlerts = accessibleDealIds.size > 0
    ? rawAlerts.filter(a => accessibleDealIds.has(a.transaction_id))
    : rawAlerts;

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
            className="text-xs px-2.5 py-1 rounded-full border transition-colors font-medium"
            style={filter === key
              ? { backgroundColor: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
              : { backgroundColor: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text-muted)" }
            }
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
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "var(--success-bg)" }}>
            <AlertCircle className="w-5 h-5" style={{ color: "var(--success)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
            {filter === "all" ? "No open alerts" : `No ${filter} alerts`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All transactions look good</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
          {filtered.map((alert) => {
            const cfg = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.deadline_approaching;
            const Icon = cfg.icon;
            return (
              <Link
                key={alert.id}
                to={`/transactions/${alert.transaction_id}`}
                className="flex items-start gap-3 p-3 rounded-lg border hover:opacity-90 transition-opacity"
                style={{ ...cfg.bgStyle, borderColor: cfg.borderColor }}
              >
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.iconColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0 rounded-full border font-semibold"
                      style={{ ...PRIORITY_BADGE_STYLE[alert.priority], borderColor: PRIORITY_BADGE_STYLE[alert.priority]?.color }}
                    >
                      {alert.priority}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{cfg.label}</span>
                  </div>
                  <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{alert.message}</p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--accent)" }}>{alert.transaction_address}</p>
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-1 flex-shrink-0 ml-1" onClick={e => e.preventDefault()}>
                  <button
                    onClick={(e) => handleResolved(e, alert)}
                    disabled={updateAlertMutation.isPending}
                    title="Mark resolved"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "var(--success-bg)", color: "var(--success)", borderColor: "var(--success)" }}
                  >
                    {updateAlertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Resolved
                  </button>
                  <button
                    onClick={(e) => handleDismiss(e, alert)}
                    disabled={updateAlertMutation.isPending}
                    title="Dismiss alert"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "var(--card-bg)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
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