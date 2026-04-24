import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, Send, X, Download, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Ban, FileSignature
} from "lucide-react";
import { format } from "date-fns";

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
};

const RECIPIENT_STATUS = {
  pending:  { icon: Clock,         color: "text-amber-500" },
  signed:   { icon: CheckCircle2,  color: "text-emerald-500" },
  declined: { icon: Ban,           color: "text-red-500" },
  expired:  { icon: AlertTriangle, color: "text-orange-500" },
};

function SignatureRow({ sig, onRefresh, onResend, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(null);

  const { data: recipients = [] } = useQuery({
    queryKey: ["sig_recipients", sig.id],
    queryFn: () => base44.entities.SignatureRecipient.filter({ signature_id: sig.id }),
    staleTime: 30_000,
  });

  const statusCfg = STATUS_CONFIG[sig.status] || STATUS_CONFIG.sent;
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  const handleAction = async (action) => {
    setLoading(action);
    await action();
    setLoading(null);
  };

  const canResend = ["sent", "viewed", "partially_signed"].includes(sig.status);
  const canCancel = ["sent", "viewed", "partially_signed"].includes(sig.status);
  const canDownload = sig.status === "completed" && sig.signed_document_url;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
        onClick={() => setExpanded(e => !e)}
      >
        <ChevronIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <FileSignature className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{sig.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sig.provider === "dropbox_sign" ? "Dropbox Sign" : sig.provider} ·{" "}
            {sig.sent_at ? format(new Date(sig.sent_at), "MMM d, yyyy") : "—"}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ backgroundColor: "var(--card-bg)" }}>
          {/* Recipients */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: "var(--text-muted)" }}>Recipients</p>
            <div className="space-y-1">
              {recipients.map(r => {
                const rcfg = RECIPIENT_STATUS[r.status] || RECIPIENT_STATUS.pending;
                const Icon = rcfg.icon;
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${rcfg.color}`} />
                    <span style={{ color: "var(--text-primary)" }}>{r.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>({r.email})</span>
                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>{r.role}</span>
                    {r.signed_at && (
                      <span style={{ color: "var(--text-muted)" }}>· Signed {format(new Date(r.signed_at), "MMM d")}</span>
                    )}
                  </div>
                );
              })}
              {recipients.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No recipients found.</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {sig.sent_at && <span>Sent: {format(new Date(sig.sent_at), "MMM d, yyyy h:mm a")}</span>}
            {sig.completed_at && <span>Completed: {format(new Date(sig.completed_at), "MMM d, yyyy h:mm a")}</span>}
            {sig.declined_at && <span>Declined: {format(new Date(sig.declined_at), "MMM d, yyyy h:mm a")}</span>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => onRefresh(sig.id)}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh Status
            </Button>
            {canResend && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => onResend(sig.id)}
              >
                <Send className="w-3 h-3 mr-1" /> Resend
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onCancel(sig.id)}
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
            {canDownload && (
              <a href={sig.signed_document_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <Download className="w-3 h-3 mr-1" /> Download Signed
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignatureRequestsPanel({ transactionId }) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);

  const { data: signatures = [], refetch } = useQuery({
    queryKey: ["signatures", transactionId],
    queryFn: () => base44.entities.SignatureRequest.filter({ transaction_id: transactionId }),
    staleTime: 30_000,
    enabled: !!transactionId,
  });

  const handleRefresh = async (sigId) => {
    setActionLoading(sigId + "_refresh");
    await base44.functions.invoke("getSignatureStatus", { signature_id: sigId });
    await refetch();
    setActionLoading(null);
  };

  const handleResend = async (sigId) => {
    setActionLoading(sigId + "_resend");
    await base44.functions.invoke("resendSignatureRequest", { signature_id: sigId });
    setActionLoading(null);
  };

  const handleCancel = async (sigId) => {
    if (!confirm("Cancel this signature request? This cannot be undone.")) return;
    setActionLoading(sigId + "_cancel");
    await base44.functions.invoke("cancelSignatureRequest", { signature_id: sigId });
    await refetch();
    setActionLoading(null);
  };

  if (signatures.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Signature Requests
          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
            {signatures.length}
          </span>
        </h3>
        <button onClick={() => refetch()} className="text-xs" style={{ color: "var(--text-muted)" }}>
          <RefreshCw className="w-3 h-3 inline mr-1" /> Refresh all
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