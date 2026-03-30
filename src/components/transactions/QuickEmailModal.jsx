import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function QuickEmailModal({ to, toName, transaction, onClose }) {
  const [subject, setSubject] = useState(`Re: ${transaction?.address || ""}`);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    await base44.functions.invoke("sendGmailEmail", {
      to: [to],
      subject,
      body: body.replace(/\n/g, "<br>"),
      transaction_id: transaction?.id,
      brokerage_id: transaction?.brokerage_id,
    });
    setSending(false);
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New Email</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              To: <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{toName ? `${toName} <${to}>` : to}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 flex-1">
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none transition-colors"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            placeholder="Write your message…"
            rows={7}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSend(); }}
          />
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>⌘+Enter to send</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: sent ? "#16a34a" : "var(--accent)" }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sent ? "Sent!" : sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}