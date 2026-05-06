import React, { useState } from "react";
import { complianceReportsApi } from "@/api/complianceReports";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldX, AlertTriangle, Loader2, RefreshCw,
  Info, ChevronRight,
} from "lucide-react";
import { useTransactionComplianceReports } from "@/hooks/useTransactionResources";

const SEV_CONFIG = {
  blocker: { icon: ShieldX, cls: "text-red-600", bg: "bg-red-50 border-red-100", badge: "bg-red-100 text-red-700" },
  warning: { icon: AlertTriangle, cls: "text-amber-500", bg: "bg-amber-50 border-amber-100", badge: "bg-amber-100 text-amber-700" },
  info:    { icon: Info, cls: "text-blue-500", bg: "bg-blue-50 border-blue-100", badge: "bg-blue-100 text-blue-700" },
};

export default function ComplianceMonitorWidget({ transaction, onNavigateToCompliance }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [resolvedIds, setResolvedIds] = useState(() => new Set());

  const { data: reports = [], isLoading } = useTransactionComplianceReports(transaction.id, { enabled: !!transaction.id });

  const issues = reports
    .flatMap((report) => (report.all_issues || []).map((issue) => ({ ...issue, report_id: report.id })))
    .filter((issue) => !resolvedIds.has(issue.id));

  const blockers = issues.filter(i => i.severity === "blocker");
  const warnings = issues.filter(i => ["warning", "high", "medium"].includes(i.severity));
  const infos = issues.filter(i => ["info", "low"].includes(i.severity));

  const runDeadlineCheck = async () => {
    setScanning(true);
    try {
      await complianceReportsApi.scan({ transaction_id: transaction.id });
      queryClient.invalidateQueries({ queryKey: ["compliance-reports", transaction.id] });
    } finally {
      setScanning(false);
    }
  };

  const allOpen = [...blockers, ...warnings, ...infos];
  const displayIssues = allOpen.slice(0, 4);

  const overallStatus = blockers.length > 0 ? "blockers"
    : warnings.length > 0 ? "warnings"
    : issues.length > 0 ? "info"
    : "clean";

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          {overallStatus === "blockers" && <ShieldX className="w-4 h-4 text-red-500" />}
          {overallStatus === "warnings" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          {overallStatus === "info" && <Info className="w-4 h-4 text-blue-500" />}
          {overallStatus === "clean" && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Compliance Monitor</span>
          {blockers.length > 0 && (
            <Badge className="bg-red-100 text-red-700 text-[10px]">{blockers.length} Blocker{blockers.length > 1 ? "s" : ""}</Badge>
          )}
          {warnings.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px]">{warnings.length} Warning{warnings.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={runDeadlineCheck}
            disabled={scanning}
          >
            {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {scanning ? "Scanning…" : "Run Check"}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-xs gap-0.5 text-blue-600"
            onClick={onNavigateToCompliance}
          >
            Full Report <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : overallStatus === "clean" ? (
          <div className="flex items-center gap-2 py-1 text-sm text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
            No open compliance issues. Transaction looks good.
          </div>
        ) : (
          <div className="space-y-2">
            {displayIssues.map((issue) => {
              const cfg = SEV_CONFIG[issue.severity] || SEV_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={issue.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.cls}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                      {issue.description || issue.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] capitalize ${cfg.badge}`}>{issue.severity}</Badge>
                      {issue.type && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {issue.type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 text-[10px] font-medium text-emerald-600 hover:text-emerald-800 whitespace-nowrap"
                    onClick={() => setResolvedIds((current) => new Set([...current, issue.id]))}
                  >
                    Resolve
                  </button>
                </div>
              );
            })}
            {allOpen.length > 4 && (
              <button
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1"
                onClick={onNavigateToCompliance}
              >
                +{allOpen.length - 4} more issues — View full report <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}