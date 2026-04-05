import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Send, ChevronDown, ChevronUp, Mail, MessageSquare, CheckCircle2, AlertTriangle, Clock, X } from "lucide-react";
import { format } from "date-fns";

const TYPE_LABELS = {
  buyer_under_contract_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-50 border-blue-200 text-blue-700" },
  seller_under_contract_email: { label: "Seller Email", icon: Mail, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  lender_title_intro_email: { label: "Lender / Title Email", icon: Mail, color: "bg-purple-50 border-purple-200 text-purple-700" },
  buyer_sms: { label: "Buyer SMS", icon: MessageSquare, color: "bg-sky-50 border-sky-200 text-sky-700" },
  seller_sms: { label: "Seller SMS", icon: MessageSquare, color: "bg-teal-50 border-teal-200 text-teal-700" },
};

const STATUS_CONFIG = {
  ready:   { label: "Ready to Send", cls: "bg-emerald-100 text-emerald-700", icon: Clock },
  partial: { label: "Partial",        cls: "bg-amber-100 text-amber-700",   icon: AlertTriangle },
  blocked: { label: "Blocked",        cls: "bg-red-100 text-red-700",       icon: AlertTriangle },
  sent:    { label: "Sent",           cls: "bg-gray-100 text-gray-600",     icon: CheckCircle2 },
  draft:   { label: "Draft",          cls: "bg-gray-100 text-gray-500",     icon: Clock },
};

export default function CommMessageCard({ comm, onSend, onRegenerate, sending }) {
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const typeCfg = TYPE_LABELS[comm.template_type] || { label: comm.template_type, icon: Mail, color: "bg-gray-50 border-gray-200 text-gray-700" };
  const statusCfg = STATUS_CONFIG[comm.template_status] || STATUS_CONFIG.draft;
  const Icon = typeCfg.icon;
  const StatusIcon = statusCfg.icon;

  const isSent = comm.template_status === "sent";
  const isBlocked = comm.template_status === "blocked";
  const canSend = !isSent && !isBlocked;
  const isEmail = comm.template_type.includes("email");

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold flex-shrink-0 ${typeCfg.color}`}>
          <Icon className="w-3.5 h-3.5" />
          {typeCfg.label}
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </div>

        <div className="flex-1 min-w-0">
          {comm.subject && (
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>{comm.subject}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setPreviewing(p => !p)}>
            <Eye className="w-3.5 h-3.5" />
            {previewing ? "Hide" : "Preview"}
          </Button>
          {canSend && isEmail && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setConfirmOpen(true)}
              disabled={sending === comm.id}
            >
              <Send className="w-3.5 h-3.5" />
              {sending === comm.id ? "Sending…" : "Send Now"}
            </Button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-gray-100 transition-colors" style={{ color: "var(--text-muted)" }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recipients */}
      {expanded && (
        <div className="px-4 pb-3 border-t text-xs space-y-1.5 pt-3" style={{ borderColor: "var(--card-border)" }}>
          {comm.recipients?.length > 0 && (
            <div className="flex gap-2">
              <span className="font-medium w-6" style={{ color: "var(--text-muted)" }}>To:</span>
              <span style={{ color: "var(--text-secondary)" }}>{comm.recipients.join(", ") || "—"}</span>
            </div>
          )}
          {comm.cc_recipients?.filter(Boolean).length > 0 && (
            <div className="flex gap-2">
              <span className="font-medium w-6" style={{ color: "var(--text-muted)" }}>CC:</span>
              <span style={{ color: "var(--text-secondary)" }}>{comm.cc_recipients.filter(Boolean).join(", ")}</span>
            </div>
          )}
          {isSent && comm.sent_at && (
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sent {format(new Date(comm.sent_at), "MMM d, yyyy 'at' h:mm a")} by {comm.sent_by?.split("@")[0]}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {previewing && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {comm.generated_content || "(no content)"}
          </pre>
        </div>
      )}

      {/* Blocked issues */}
      {(isBlocked || comm.template_status === "partial") && comm.preflight_issues?.length > 0 && (
        <div className="border-t px-4 pb-3 pt-3 space-y-2" style={{ borderColor: "var(--card-border)" }}>
          {comm.preflight_issues.filter(i => i.severity === "blocking").map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">{issue.message}</p>
                {issue.section && <p className="opacity-70 mt-0.5">{issue.section}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Confirm Send</span>
              </div>
              <button onClick={() => setConfirmOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipients */}
            <div className="px-5 py-4 space-y-3 border-b text-xs" style={{ borderColor: "var(--card-border)" }}>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${typeCfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {typeCfg.label}
              </div>
              {comm.subject && (
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>Subject</p>
                  <p style={{ color: "var(--text-primary)" }}>{comm.subject}</p>
                </div>
              )}
              {comm.recipients?.length > 0 && (
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>To</p>
                  <div className="flex flex-wrap gap-1.5">
                    {comm.recipients.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {comm.cc_recipients?.filter(Boolean).length > 0 && (
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>CC</p>
                  <div className="flex flex-wrap gap-1.5">
                    {comm.cc_recipients.filter(Boolean).map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="px-5 py-3 max-h-60 overflow-y-auto border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Message Preview</p>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {comm.generated_content || "(no content)"}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={sending === comm.id}
                onClick={() => { setConfirmOpen(false); onSend(comm.id); }}
              >
                <Send className="w-3.5 h-3.5" />
                {sending === comm.id ? "Sending…" : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}