import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, RefreshCw, Send, Zap, ShieldCheck, ShieldAlert, ShieldX, ChevronRight,
  FileText, Loader2, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import CommPreflightBadge from "./CommPreflightBadge";
import CommIssueList from "./CommIssueList";
import CommMessageCard from "./CommMessageCard";
import ContractDataSnapshot from "./ContractDataSnapshot";

const TEMPLATE_ORDER = [
  "buyer_under_contract_email",
  "seller_under_contract_email",
  "lender_title_intro_email",
  "seller_sms",
  "earnest_money_submitted_email",
  "earnest_money_confirmed_email",
  "inspection_scheduled_email",
  "inspection_completed_email",
  "appraisal_ordered_email",
  "appraisal_scheduled_email",
];

function sortComms(comms) {
  return [...comms].sort((a, b) => {
    const ai = TEMPLATE_ORDER.indexOf(a.template_type);
    const bi = TEMPLATE_ORDER.indexOf(b.template_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default function UnderContractCommsPanel({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const { data: comms = [], isLoading } = useQuery({
    queryKey: ["comm-automations", transaction.id],
    queryFn: () => base44.entities.CommAutomation.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled: !!transaction.id,
    staleTime: 10_000,
  });

  const sortedComms = sortComms(comms);
  const latestComm = sortedComms[0];
  const preflightStatus = latestComm?.preflight_status || null;
  const preflightIssues = latestComm?.preflight_issues || [];
  const contractData = latestComm?.contract_data_snapshot || null;

  const blockingIssues = preflightIssues.filter(i => i.severity === "blocking");
  const warningIssues = preflightIssues.filter(i => i.severity === "warning");

  const readyCount = comms.filter(c => c.template_status === "ready").length;
  const sentCount = comms.filter(c => c.template_status === "sent").length;
  const blockedCount = comms.filter(c => c.template_status === "blocked").length;

  const handleGenerate = async (isRegen = false) => {
    setGenerating(true);
    try {
      await base44.functions.invoke("underContractAutomation", {
        action: isRegen ? "regenerate" : "generate",
        transaction_id: transaction.id,
      });
      queryClient.invalidateQueries({ queryKey: ["comm-automations", transaction.id] });
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (commId) => {
    setSending(commId);
    try {
      await base44.functions.invoke("underContractAutomation", {
        action: "send",
        transaction_id: transaction.id,
        comm_id: commId,
      });
      queryClient.invalidateQueries({ queryKey: ["comm-automations", transaction.id] });
    } finally {
      setSending(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      await base44.functions.invoke("underContractAutomation", {
        action: "send_all",
        transaction_id: transaction.id,
      });
      queryClient.invalidateQueries({ queryKey: ["comm-automations", transaction.id] });
    } finally {
      setSendingAll(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!isLoading && comms.length === 0) {
    return (
      <div className="space-y-4">
        <AtlasBanner
          status={null}
          onGenerate={() => handleGenerate(false)}
          generating={generating}
          transaction={transaction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Atlas Banner */}
      <AtlasBanner
        status={preflightStatus}
        onGenerate={() => handleGenerate(true)}
        generating={generating}
        readyCount={readyCount}
        sentCount={sentCount}
        blockedCount={blockedCount}
        blockingIssues={blockingIssues}
        warningIssues={warningIssues}
        hasComms={comms.length > 0}
        onSendAll={handleSendAll}
        sendingAll={sendingAll}
        readyToSendAll={readyCount > 0}
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      )}

      {/* Contract Data Used */}
      {contractData && <ContractDataSnapshot data={contractData} />}

      {/* Issues */}
      {preflightIssues.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
            Atlas Preflight Issues ({preflightIssues.length})
          </p>
          <CommIssueList issues={preflightIssues} />
        </div>
      )}

      {/* Communication Cards */}
      {sortedComms.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Generated Communications ({sortedComms.length})
          </p>
          {sortedComms.map(comm => (
            <CommMessageCard
              key={comm.id}
              comm={comm}
              onSend={handleSend}
              onRegenerate={() => handleGenerate(true)}
              sending={sending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Atlas Intelligence Banner ─────────────────────────────────────────────────
function AtlasBanner({
  status, onGenerate, generating, readyCount = 0, sentCount = 0, blockedCount = 0,
  blockingIssues = [], warningIssues = [], hasComms = false,
  onSendAll, sendingAll, readyToSendAll, transaction,
}) {
  const isReady = status === "READY";
  const isPartial = status === "PARTIAL";
  const isBlocked = status === "BLOCKED";

  let BannerIcon = Bot;
  let bannerStyle = { background: "var(--bg-tertiary)", borderColor: "var(--card-border)" };
  let iconBg = "rgba(148,163,184,0.15)";
  let iconCls = "text-slate-400";

  if (isReady) { BannerIcon = ShieldCheck; bannerStyle = { background: "rgba(22,163,74,0.08)", borderColor: "rgba(22,163,74,0.3)" }; iconBg = "rgba(22,163,74,0.15)"; iconCls = "text-emerald-500"; }
  if (isPartial) { BannerIcon = ShieldAlert; bannerStyle = { background: "rgba(217,119,6,0.08)", borderColor: "rgba(217,119,6,0.3)" }; iconBg = "rgba(217,119,6,0.15)"; iconCls = "text-amber-500"; }
  if (isBlocked) { BannerIcon = ShieldX; bannerStyle = { background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.3)" }; iconBg = "rgba(220,38,38,0.15)"; iconCls = "text-red-500"; }

  const statusText = {
    READY: "All required contract data found. Communications are ready to send.",
    PARTIAL: `Core data present but ${blockingIssues.length + warningIssues.length} field(s) are missing. Some communications are blocked.`,
    BLOCKED: `${blockingIssues.length} critical field(s) missing. All communications are blocked until resolved.`,
    null: "Atlas can generate under-contract communications from this transaction's contract data.",
  }[status];

  return (
    <div className="rounded-xl border p-4" style={bannerStyle}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <BannerIcon className={`w-5 h-5 ${iconCls}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {status && <CommPreflightBadge status={status} />}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{statusText}</p>

          {hasComms && (
            <div className="flex gap-3 mt-2 text-xs">
              {readyCount > 0 && <span className="text-emerald-500 font-semibold">{readyCount} Ready</span>}
              {sentCount > 0 && <span style={{ color: "var(--text-muted)" }} className="font-semibold">{sentCount} Sent</span>}
              {blockedCount > 0 && <span className="text-red-500 font-semibold">{blockedCount} Blocked</span>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {!hasComms ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {generating ? "Generating…" : "Generate Communications"}
            </Button>
          ) : (
            <>
              {readyToSendAll && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onSendAll}
                  disabled={sendingAll}
                >
                  {sendingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingAll ? "Sending…" : "Send All Ready"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={onGenerate}
                disabled={generating}
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {generating ? "Regenerating…" : "Regenerate"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}