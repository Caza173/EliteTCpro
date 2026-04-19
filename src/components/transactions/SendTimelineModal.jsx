import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Send, Loader2 } from "lucide-react";

export default function SendTimelineModal({ transaction, onClose, onSend }) {
  // Build known contacts from transaction
  const knownContacts = [
    transaction.client_email && { label: `Client — ${transaction.client_email}`, email: transaction.client_email },
    ...(transaction.client_emails || []).filter(e => e && e !== transaction.client_email).map(e => ({ label: `Client — ${e}`, email: e })),
    transaction.agent_email && { label: `Agent — ${transaction.agent_email}`, email: transaction.agent_email },
    transaction.buyers_agent_email && transaction.buyers_agent_email !== transaction.agent_email && { label: `Buyer's Agent — ${transaction.buyers_agent_email}`, email: transaction.buyers_agent_email },
    transaction.sellers_agent_email && { label: `Seller's Agent — ${transaction.sellers_agent_email}`, email: transaction.sellers_agent_email },
    transaction.lender_email && { label: `Lender — ${transaction.lender_email}`, email: transaction.lender_email },
    transaction.title_company_email && { label: `Title — ${transaction.title_company_email}`, email: transaction.title_company_email },
    transaction.inspector_email && { label: `Inspector — ${transaction.inspector_email}`, email: transaction.inspector_email },
    transaction.attorney_email && { label: `Attorney — ${transaction.attorney_email}`, email: transaction.attorney_email },
    ...(transaction.additional_contacts || []).filter(c => c.email).map(c => ({ label: `${c.role || c.name} — ${c.email}`, email: c.email })),
  ].filter(Boolean);

  // Deduplicate by email
  const seen = new Set();
  const uniqueContacts = knownContacts.filter(c => {
    if (seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });

  // Default: client + agent checked
  const defaultChecked = new Set(
    uniqueContacts.filter(c => c.email === transaction.client_email || c.email === transaction.agent_email).map(c => c.email)
  );

  const [checked, setChecked] = useState(defaultChecked);
  const [customEmail, setCustomEmail] = useState("");
  const [customEmails, setCustomEmails] = useState([]);
  const [sending, setSending] = useState(false);

  const toggleContact = (email) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const addCustomEmail = () => {
    const email = customEmail.trim();
    if (!email || !email.includes("@")) return;
    if (!customEmails.includes(email)) setCustomEmails(prev => [...prev, email]);
    setCustomEmail("");
  };

  const removeCustomEmail = (email) => setCustomEmails(prev => prev.filter(e => e !== email));

  const allRecipients = [...checked, ...customEmails];

  const handleSend = async () => {
    if (allRecipients.length === 0) return;
    setSending(true);
    await onSend(allRecipients);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-2xl border shadow-2xl w-full max-w-md mx-4 p-5 space-y-4"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Send Timeline</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Select recipients for the deadline timeline email</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Known contacts */}
        {uniqueContacts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Transaction Contacts</p>
            {uniqueContacts.map(c => (
              <label key={c.email} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                style={{ border: "1px solid var(--card-border)" }}>
                <input
                  type="checkbox"
                  checked={checked.has(c.email)}
                  onChange={() => toggleContact(c.email)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{c.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Custom emails */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Add Custom Email</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="someone@example.com"
              value={customEmail}
              onChange={e => setCustomEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomEmail()}
              className="h-8 text-xs"
            />
            <Button size="sm" variant="outline" className="h-8 px-3" onClick={addCustomEmail}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {customEmails.map(email => (
            <div key={email} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <span>{email}</span>
              <button onClick={() => removeCustomEmail(email)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--card-border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {allRecipients.length} recipient{allRecipients.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSend}
              disabled={allRecipients.length === 0 || sending}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}