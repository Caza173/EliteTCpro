import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, AlertCircle, Info, X, ChevronRight,
  Clock, FileX, ShieldAlert, ListX, Zap, RefreshCw, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ALERT_CONFIG = {
  deadline_approaching: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Deadline" },
  deadline_overdue:     { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Overdue" },
  tasks_overdue:        { icon: ListX, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Tasks" },
  missing_documents:    { icon: FileX, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", label: "Docs" },
  compliance_blockers:  { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Compliance" },
  closing_risk:         { icon: Zap, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "Closing Risk" },
};

const PRIORITY_ORDER = { critical: 0, warning: 1, info: 2 };
const PRIORITY_BADGE = {
  critical: "bg-red-100 text-red-700 border-red-200",
  warning:  "bg-amber-100 text-amber-700 border-amber-200",
  info:     "bg-blue-100 text-blue-700 border-blue-200",
};

export default function TransactionAlertsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all"); // "all" | "critical" | "warning" | "info"
  const [scanning, setScanning] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["monitor-alerts"],
    queryFn: () => base44.entities.MonitorAlert.filter({ status: "open" }, "-created_date", 100),
    staleTime: 60_000,
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.MonitorAlert.update(id, { status: "dismissed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitor-alerts"] }),
  });

  const runScan = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke("superagentMonitor", {});
      queryClient.invalidateQueries({ queryKey: ["monitor-alerts"] });
    } finally {
      setScanning(false);
    }
  };

  const sorted = [...alerts].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  );

  const filtered = filter === "all" ? sorted : sorted.filter(a => a.priority === filter);

  const critCount = alerts.filter(a => a.priority === "critical").length;
  const warnCount = alerts.filter(a => a.priority === "warning").length;
  const infoCount = alerts.filter(a => a.priority === "info").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Transaction Alerts</span>
          {alerts.length > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200 border">{alerts.length}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {scanning ? "Scanning..." : "Scan Now"}
        </Button>
      </div>

      {/* Priority filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all", label: "All", count: alerts.length },
          { key: "critical", label: "Critical", count: critCount },
          { key: "warning", label: "Warning", count: warnCount },
          { key: "info", label: "Info", count: infoCount },
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

      {/* Alerts list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg animate-pulse bg-gray-100" />
          ))}
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
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border} group`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_BADGE[alert.priority]}`}>
                      {alert.priority}
                    </Badge>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                  </div>
                  <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                    {alert.message}
                  </p>
                  {alert.transaction_address && (
                    <Link
                      to={`${createPageUrl("TransactionDetail")}?id=${alert.transaction_id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 mt-1 font-medium"
                    >
                      {alert.transaction_address} <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => dismissMutation.mutate(alert.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/60 flex-shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}