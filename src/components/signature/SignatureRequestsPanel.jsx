import React, { useState } from "react";
import { signatureRequestsApi } from "@/api/signatureRequests";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Send, X, Download, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Ban, FileSignature, PenLine
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import SignatureProgressBar from "./SignatureProgressBar";
import { getNeedsAttentionState } from "@/lib/signatureRequirementEngine";

const STATUS_CONFIG = {
  draft:            { label: "Draft",            color: "bg-slate-100 text-slate-500" },
  sent:             { label: "Sent",             color: "bg-blue-50 text-blue-600" },
  viewed:           { label: "Viewed",           color: "bg-indigo-50 text-indigo-600" },
  partially_signed: { label: "Partial",          color: "bg-amber-50 text-amber-600" },
  completed:        { label: "Completed",        color: "bg-emerald-50 text-emerald-700" },
  declined:         { label: "Declined",         color: "bg-red-50 text-red-600" },
  expired:          { label: "Expired",          color: "bg-orange-50 text-orange-600" },
  cancelled:        { label: "Cancelled",        color: "bg-slate-100 text-slate-400" },
  error:            { label: "Error",            color: "bg-red-50 text-red-600" },
  needs_attention:  { label: "⚠ Action Required", color: "bg-red-50 text-red-700" },
};

const RECIPIENT_STATUS = {
  pending:  { icon: Clock,         color: "text-amber-500",   label: "Pending" },
  viewed:   { icon: Clock,         color: "text-blue-500",    label: "Viewed" },
  signed:   { icon: CheckCircle2,  color: "text-emerald-500", label: "Signed" },
  declined: { icon: Ban,           color: "text-red-500",     label: "Declined" },
};

function SignatureRow({ sig, onRefresh, onResend, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const recipients = Array.isArray(sig.recipients) ? sig.recipients : [];

  const statusCfg = STATUS_CONFIG[sig.status] || STATUS_CONFIG.sent;
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  const canResend = ["sent", "viewed", "partially_signed", "needs_attention"].includes(sig.status);
  const canCancel = ["sent", "viewed", "partially_signed"].includes(sig.status);
  const canDownload = sig.status === "completed" && sig.signed_document_url;

  const needsAttention = sig.status === "needs_attention" ||
    ["declined", "expired", "error"].includes(sig.status);

  // Progress from entity fields or compute from recipients
  const progressCompleted = sig.progress_completed ?? recipients.filter(r => r.status === "signed").length;
  const progressTotal = sig.progress_total ?? recipients.length;

  const attentionState = getNeedsAttentionState(sig, recipients);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: needsAttention ? "#fca5a5" : "var(--border)",
        backgroundColor: needsAttention ? "rgba(239,68,68,0.03)" : "transparent",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: needsAttention ? "rgba(239,68,68,0.05)" : "var(--bg-tertiary)" }}
        onClick={() => setExpanded(e => !e)}
      >
        <ChevronIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <FileSignature className="w-4 h-4 flex-shrink-0" style={{ color: needsAttention ? "#ef4444" : "var(--accent)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{sig.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sig.provider === "dropbox_sign" ? "Dropbox Sign" : sig.provider}
            {sig.sent_at && ` · Sent ${formatDistanceToNow(new Date(sig.sent_at), { addSuffix: true })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {progressTotal > 0 && (
            <SignatureProgressBar
              completed={progressCompleted}
              total={progressTotal}
              status={sig.status}
              compact
            />
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Needs attention banner */}
      {needsAttention && attentionState.needs_attention && (
        <div className="px-4 py-2 border-t flex items-center gap-2" style={{ borderColor: "#fca5a5", backgroundColor: "rgba(239,68,68,0.06)" }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-600">{attentionState.reason}</p>
            <p className="text-xs text-red-500">{attentionState.action}</p>
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ backgroundColor: "var(--card-bg)" }}>
          {/* Progress bar */}
          {progressTotal > 0 && (
            <SignatureProgressBar
              completed={progressCompleted}
              total={progressTotal}
              status={sig.status}
            />
          )}

          {/* Recipients */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: "var(--text-muted)" }}>Recipients</p>
            <div className="space-y-1.5">
              {recipients.map(r => {
                const rcfg = RECIPIENT_STATUS[r.status] || RECIPIENT_STATUS.pending;
                const Icon = rcfg.icon;
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${rcfg.color}`} />
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>({r.email})</span>
                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>{r.role}</span>
                    <span className={`text-[10px] font-semibold ${rcfg.color}`}>{rcfg.label}</span>
                    {r.signed_at && (
                      <span style={{ color: "var(--text-muted)" }}>· {format(new Date(r.signed_at), "MMM d, h:mm a")}</span>
                    )}
                    {r.viewed_at && r.status !== "signed" && (
                      <span style={{ color: "var(--text-muted)" }}>· Viewed {format(new Date(r.viewed_at), "MMM d")}</span>
                    )}
                  </div>
                );
              })}
              {recipients.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No recipients found.</p>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {sig.sent_at && <span>Sent: {format(new Date(sig.sent_at), "MMM d, yyyy h:mm a")}</span>}
            {sig.last_reminder_sent_at && <span>Last reminder: {format(new Date(sig.last_reminder_sent_at), "MMM d, h:mm a")}</span>}
            {sig.completed_at && <span className="text-emerald-600 font-medium">Completed: {format(new Date(sig.completed_at), "MMM d, yyyy h:mm a")}</span>}
            {sig.declined_at && <span className="text-red-500 font-medium">Declined: {format(new Date(sig.declined_at), "MMM d, yyyy h:mm a")}</span>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onRefresh(sig.id)}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            {canResend && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onResend(sig.id)}>
                <Send className="w-3 h-3 mr-1" /> Resend Reminder
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onCancel(sig.id)}>
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
            {canDownload && (
              <a href={sig.signed_document_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                  <Download className="w-3 h-3 mr-1" /> Download Signed PDF
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignatureRequestsPanel({ transactionId, documents = [], onSendNew }) {
  const [actionLoading, setActionLoading] = useState(null);

  const { data: signatures = [], refetch } = useQuery({
    queryKey: ["signatures", transactionId],
    queryFn: () => signatureRequestsApi.list({ transaction_id: transactionId }),
    staleTime: 30_000,
    enabled: !!transactionId,
  });

  const handleRefresh = async (sigId) => {
    setActionLoading(sigId + "_refresh");
    await signatureRequestsApi.refresh(sigId);
    await refetch();
    setActionLoading(null);
  };

  const handleResend = async (sigId) => {
    setActionLoading(sigId + "_resend");
    await signatureRequestsApi.resend(sigId);
    await refetch();
    setActionLoading(null);
  };

  const handleCancel = async (sigId) => {
    if (!confirm("Cancel this signature request? This cannot be undone.")) return;
    setActionLoading(sigId + "_cancel");
    await signatureRequestsApi.cancel(sigId);
    await refetch();
    setActionLoading(null);
  };

  const needsAttentionCount = signatures.filter(s =>
    s.status === "needs_attention" || ["declined", "expired", "error"].includes(s.status)
  ).length;

  const completedCount = signatures.filter(s => s.status === "completed").length;
  const activeCount = signatures.filter(s => ["sent", "viewed", "partially_signed"].includes(s.status)).length;

  if (signatures.length === 0) {
    if (!onSendNew || documents.length === 0) return null;
    return (
      <div className="rounded-xl border border-dashed px-4 py-5 text-center" style={{ borderColor: "var(--border)" }}>
        <FileSignature className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>No signature requests yet</p>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Send documents for signature to track signing status here</p>
        {onSendNew && (
          <Button size="sm" onClick={onSendNew} style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}>
            <PenLine className="w-3.5 h-3.5 mr-1.5" /> Send for Signature
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Signature Requests
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
            {signatures.length}
          </span>
          {needsAttentionCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">
              ⚠ {needsAttentionCount} need{needsAttentionCount !== 1 ? "" : "s"} attention
            </span>
          )}
          {completedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              {completedCount} completed
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {signatures.map(sig => (
        <SignatureRow
          key={sig.id}
          sig={sig}
          onRefresh={handleRefresh}
          onResend={handleResend}
          onCancel={handleCancel}
        />
      ))}
    </div>
  );
}