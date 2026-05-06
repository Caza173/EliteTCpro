import React, { useState } from "react";
import { commAutomationsApi } from "@/api/commAutomations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Send, ChevronDown, ChevronUp, Mail, MessageSquare, CheckCircle2, AlertTriangle, Clock, X, Pencil, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TYPE_LABELS = {
  buyer_under_contract_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  seller_under_contract_email: { label: "Seller Email", icon: Mail, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  lender_title_intro_email: { label: "Lender / Title Email", icon: Mail, color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  buyer_sms: { label: "Buyer SMS", icon: MessageSquare, color: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
  seller_sms: { label: "Seller SMS", icon: MessageSquare, color: "bg-teal-500/10 border-teal-500/30 text-teal-400" },
  earnest_money_submitted_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  earnest_money_confirmed_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  inspection_scheduled_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  inspection_completed_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  appraisal_ordered_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  appraisal_scheduled_email: { label: "Buyer Email", icon: Mail, color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
};

const STATUS_CONFIG = {
  ready:   { label: "Ready to Send", cls: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle2 },
  partial: { label: "Partial",        cls: "bg-amber-500/15 text-amber-400",   icon: AlertTriangle },
  blocked: { label: "Blocked",        cls: "bg-red-500/15 text-red-400",       icon: AlertTriangle },
  sent:    { label: "Sent",           cls: "bg-slate-500/15 text-slate-400",   icon: CheckCircle2 },
  draft:   { label: "Draft",          cls: "bg-slate-500/15 text-slate-400",   icon: Clock },
};

export default function CommMessageCard({ comm, onSend, onRegenerate, sending, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(comm.subject || "");
  const [editBody, setEditBody] = useState(comm.generated_content || "");
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    setSaving(true);
    await commAutomationsApi.update(comm.id, {
      subject: editSubject,
      generated_content: editBody,
    });
    setSaving(false);
    setEditing(false);
    toast.success("Template saved");
    onUpdated?.();
  };

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
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditing(false); setPreviewing(p => !p); }}>
            <Eye className="w-3.5 h-3.5" />
            {previewing ? "Hide" : "Preview"}
          </Button>
          {!isSent && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditSubject(comm.subject || ""); setEditBody(comm.generated_content || ""); setEditing(e => !e); setPreviewing(false); }}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
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
      {previewing && !editing && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {comm.generated_content || "(no content)"}
          </pre>
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "var(--text-muted)" }}>Subject</label>
            <input
              value={editSubject}
              onChange={e => setEditSubject(e.target.value)}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "var(--text-muted)" }}>Body</label>
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={10}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none font-mono resize-y"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveEdit} disabled={saving}>
              <Save className="w-3 h-3" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
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