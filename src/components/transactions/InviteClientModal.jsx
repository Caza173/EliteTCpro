import React, { useState } from "react";
import { X, Plus, Trash2, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InviteClientModal({ transaction, onConfirm, onCancel, sending }) {
  // Build default recipient list from transaction
  const buildDefaults = () => {
    const recipients = [];
    const clientEmails = transaction?.client_emails?.length
      ? transaction.client_emails
      : transaction?.client_email ? [transaction.client_email] : [];
    clientEmails.forEach(e => { if (e) recipients.push({ email: e, label: "Client", selected: true }); });

    const agentEmail = transaction?.agent_email || transaction?.buyers_agent_email;
    if (agentEmail) recipients.push({ email: agentEmail, label: "Agent", selected: true });

    return recipients;
  };

  const [recipients, setRecipients] = useState(buildDefaults);
  const [newEmail, setNewEmail] = useState("");

  const toggle = (idx) => {
    setRecipients(r => r.map((rec, i) => i === idx ? { ...rec, selected: !rec.selected } : rec));
  };

  const remove = (idx) => {
    setRecipients(r => r.filter((_, i) => i !== idx));
  };

  const addEmail = () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    setRecipients(r => [...r, { email: trimmed, label: "Custom", selected: true }]);
    setNewEmail("");
  };

  const selected = recipients.filter(r => r.selected).map(r => r.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative rounded-2xl border shadow-xl w-full max-w-md mx-4 p-6 space-y-5"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Send Portal Invites</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{transaction?.address}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recipients</p>
          {recipients.length === 0 && (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No recipients — add one below.</p>
          )}
          {recipients.map((rec, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
              style={{ borderColor: "var(--card-border)", background: rec.selected ? "var(--bg-tertiary)" : "transparent" }}>
              <input
                type="checkbox"
                checked={rec.selected}
                onChange={() => toggle(idx)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
              />
              <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{rec.email}</p>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{rec.label}</span>
              <button onClick={() => remove(idx)} className="p-0.5 rounded hover:text-red-500 transition-colors" style={{ color: "var(--text-muted)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add email */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Add Recipient</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEmail()}
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addEmail}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-9" onClick={onCancel} disabled={sending}>Cancel</Button>
          <Button
            className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            disabled={sending || selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {sending ? "Sending…" : `Send to ${selected.length}`}
          </Button>
        </div>
      </div>
    </div>
  );
}