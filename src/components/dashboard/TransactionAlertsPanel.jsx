import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, AlertCircle, Clock, ListX, Zap, X, CheckCircle2, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "../auth/useCurrentUser";
import { useAccessibleDealIds } from "../../lib/useDealAccess";
import { isTransactionClosed } from "../../lib/transactionStatusHelpers";

const ALERT_CONFIG = {
  deadline_overdue:     { icon: AlertTriangle, iconColor: "var(--danger)",   bgStyle: { backgroundColor: "var(--danger-bg)" },  borderColor: "var(--danger)",   label: "Overdue" },
  deadline_approaching: { icon: Clock,         iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Deadline" },
  tasks_overdue:        { icon: ListX,         iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Tasks" },
  closing_risk:         { icon: Zap,           iconColor: "var(--accent)",   bgStyle: { backgroundColor: "var(--accent-subtle)" }, borderColor: "var(--accent)",   label: "Closing" },
  missing_documents:    { icon: AlertCircle,   iconColor: "var(--warning)",  bgStyle: { backgroundColor: "var(--warning-bg)" }, borderColor: "var(--warning)",  label: "Documents" },
  compliance_blockers:  { icon: AlertTriangle, iconColor: "var(--danger)",   bgStyle: { backgroundColor: "var(--danger-bg)" },  borderColor: "var(--danger)",   label: "Compliance" },
};

export default function TransactionAlertsPanel() {
  const [filter, setFilter] = useState("all");
  const [dbAlerts, setDbAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const { accessibleDealIds } = useAccessibleDealIds();

  const fetchAlerts = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const alerts = await base44.entities.MonitorAlert.filter({ alert_state: "active" });
      const filtered = alerts.filter(a =>
        accessibleDealIds.has(a.transaction_id) &&
        !isTransactionClosed(a.transaction_status)
      );
      setDbAlerts(filtered);
    } catch {
      setDbAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, accessibleDealIds]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleClearAll = async () => {
    setMutating(true);
    await Promise.all(filtered.map(a =>
      base44.entities.MonitorAlert.update(a.id, { alert_state: "dismissed", dismissed_at: new Date().toISOString() })
    ));
    await fetchAlerts();
    setMutating(false);
  };

  const handleDismiss = async (e, alert) => {
    e.preventDefault();
    e.stopPropagation();
    setMutating(true);
    await base44.entities.MonitorAlert.update(alert.id, { alert_state: "dismissed", dismissed_at: new Date().toISOString() });
    await fetchAlerts();
    setMutating(false);
  };

  const handleResolved = async (e, alert) => {
    e.preventDefault();
    e.stopPropagation();
    setMutating(true);
    await base44.entities.MonitorAlert.update(alert.id, { alert_state: "resolved", resolved_at: new Date().toISOString() });
    await fetchAlerts();
    setMutating(false);
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

      {filtered.length > 0 && (
        <button
          onClick={handleClearAll}
          disabled={mutating}
          className="text-xs font-medium hover:underline disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Clear all
        </button>
      )}

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
            className="text-xs px-2.5 py-px rounded border transition-colors font-medium"
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
                className="flex items-center gap-2 p-2 rounded-lg border hover:opacity-90 transition-opacity"
                style={{ ...cfg.bgStyle, borderColor: cfg.borderColor }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.iconColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{alert.deadline_label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {alert.days_remaining < 0 ? `Overdue by ${Math.abs(alert.days_remaining)} days` : `${alert.days_remaining} days remaining`}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--accent)" }}>{alert.transaction_address}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.preventDefault()}>
                  <button
                    onClick={(e) => handleResolved(e, alert)}
                    disabled={mutating}
                    title="Mark resolved"
                    className="flex items-center gap-0.5 px-2 py-px rounded text-[9px] font-semibold border transition-colors disabled:opacity-50 whitespace-nowrap"
                    style={{ backgroundColor: "var(--success-bg)", color: "var(--success)", borderColor: "var(--success)" }}
                  >
                    {mutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Resolved
                  </button>
                  <button
                    onClick={(e) => handleDismiss(e, alert)}
                    disabled={mutating}
                    title="Dismiss alert"
                    className="flex items-center gap-0.5 px-2 py-px rounded text-[9px] font-semibold border transition-colors disabled:opacity-50 whitespace-nowrap"
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