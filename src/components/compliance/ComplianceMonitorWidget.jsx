import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldX, AlertTriangle, Loader2, RefreshCw,
  Info, CheckCircle2, ChevronRight, Scan,
} from "lucide-react";

const SEV_CONFIG = {
  blocker: { icon: ShieldX, cls: "text-red-600", bg: "bg-red-50 border-red-100", badge: "bg-red-100 text-red-700" },
  warning: { icon: AlertTriangle, cls: "text-amber-500", bg: "bg-amber-50 border-amber-100", badge: "bg-amber-100 text-amber-700" },
  info:    { icon: Info, cls: "text-blue-500", bg: "bg-blue-50 border-blue-100", badge: "bg-blue-100 text-blue-700" },
};

export default function ComplianceMonitorWidget({ transaction, onNavigateToCompliance }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["compliance-issues", transaction.id],
    queryFn: () => base44.entities.ComplianceIssue.filter(
      { transaction_id: transaction.id, status: "open" },
      "-created_date"
    ),
    enabled: !!transaction.id,
  });

  const resolveIssueMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceIssue.update(id, { status: "resolved" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["compliance-issues", transaction.id] }),
  });

  const blockers = issues.filter(i => i.severity === "blocker");
  const warnings = issues.filter(i => i.severity === "warning");
  const infos = issues.filter(i => i.severity === "info");

  const runDeadlineCheck = async () => {
    setScanning(true);
    const { data: financeData = [] } = await base44.entities.TransactionFinance.filter({ transaction_id: transaction.id });
    const finance = financeData[0] || {};
    const { data: checklistItems = [] } = await base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id });

    await base44.functions.invoke("complianceEngine", {
      transaction_id: transaction.id,
      brokerage_id: transaction.brokerage_id,
      transaction_data: {
        address: transaction.address,
        transaction_type: transaction.transaction_type,
        is_cash_transaction: transaction.is_cash_transaction,
        sale_price: finance.sale_price || transaction.sale_price,
        seller_concession_amount: finance.seller_concession_amount,
        professional_fee_amount: finance.professional_fee_amount,
        phase: transaction.phase,
        brokerage_id: transaction.brokerage_id,
        inspection_deadline: transaction.inspection_deadline,
        appraisal_deadline: transaction.appraisal_deadline,
        financing_deadline: transaction.financing_deadline,
        earnest_money_deadline: transaction.earnest_money_deadline,
        due_diligence_deadline: transaction.due_diligence_deadline,
        closing_date: transaction.closing_date,
        ctc_target: transaction.ctc_target,
        checklist_items: checklistItems,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["compliance-issues", transaction.id] });
    setScanning(false);
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
                      {issue.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] capitalize ${cfg.badge}`}>{issue.severity}</Badge>
                      {issue.issue_type && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {issue.issue_type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 text-[10px] font-medium text-emerald-600 hover:text-emerald-800 whitespace-nowrap"
                    onClick={() => resolveIssueMutation.mutate(issue.id)}
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