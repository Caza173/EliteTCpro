import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, Send, Loader2, ExternalLink } from "lucide-react";
import AutoPlacementBadge from "./AutoPlacementBadge";
import { buildPlacementConfig, validateRecipientsForDocType, describePlacementConfig } from "@/lib/signaturePlacementService";

const ROLES = ["buyer", "seller", "agent", "attorney", "lender", "title", "other"];

export default function SendForSignatureModal({ transaction, document: doc, onClose, onSent }) {
  const [recipients, setRecipients] = useState(() => {
    const defaults = [];
    if (transaction?.agent && transaction?.agent_email) {
      defaults.push({ name: transaction.agent, email: transaction.agent_email, role: "agent", routing_order: 1 });
    }
    if (transaction?.buyer) {
      defaults.push({ name: transaction.buyer, email: transaction.client_email || "", role: "buyer", routing_order: 2 });
    }
    return defaults.length ? defaults : [{ name: "", email: "", role: "buyer", routing_order: 1 }];
  });

  const [subject, setSubject] = useState(`Signature Request: ${transaction?.address || ""}`);
  const [message, setMessage] = useState(`Please review and sign the attached document for ${transaction?.address || ""}.`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [placementStatus, setPlacementStatus] = useState(null); // null | "detecting" | { placement_mode, summary, ... }

  // Auto-detect signature placement whenever recipients change
  useEffect(() => {
    if (!doc?.file_url || recipients.length === 0) return;
    const validRecipients = recipients.filter(r => r.name && r.email);
    if (validRecipients.length === 0) return;

    let cancelled = false;
    setPlacementStatus("detecting");

    base44.functions.invoke("autoPlaceSignatures", {
      document_url: doc.file_url,
      document_type: doc.doc_type || "other",
      file_name: doc.file_name,
      transaction_id: transaction?.id,
      recipients: validRecipients,
    }).then(res => {
      if (!cancelled && res?.data?.success) {
        setPlacementStatus(res.data);
      } else if (!cancelled) {
        setPlacementStatus(null);
      }
    }).catch(() => {
      if (!cancelled) setPlacementStatus(null);
    });

    return () => { cancelled = true; };
  }, [doc?.file_url, doc?.doc_type, recipients.map(r => r.role + r.email).join(",")]);

  const addRecipient = () => {
    setRecipients(r => [...r, { name: "", email: "", role: "other", routing_order: r.length + 1 }]);
  };

  const removeRecipient = (i) => {
    setRecipients(r => r.filter((_, idx) => idx !== i));
  };

  const updateRecipient = (i, field, value) => {
    setRecipients(r => r.map((rec, idx) => idx === i ? { ...rec, [field]: value } : rec));
  };

  const handleSend = async () => {
    setError(null);
    for (const r of recipients) {
      if (!r.name.trim()) return setError("All recipients must have a name.");
      if (!r.email.trim()) return setError("All recipients must have an email.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return setError(`Invalid email: ${r.email}`);
    }

    setSending(true);
    const res = await base44.functions.invoke("createSignatureRequest", {
      transaction_id: transaction.id,
      document_id: doc.id,
      title: doc.file_name || "Signature Request",
      subject,
      message,
      recipients,
    });

    setSending(false);
    if (res.data?.success) {
      onSent?.();
      onClose();
    } else {
      setError(res.data?.error || "Failed to send signature request.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow-hover)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Send for Signature</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{doc?.file_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Document preview link */}
          {doc?.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--accent)", backgroundColor: "var(--accent-subtle)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview document
            </a>
          )}

          {/* Auto-placement status */}
          <AutoPlacementBadge status={placementStatus} />

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>RECIPIENTS</label>
              <button onClick={addRecipient} className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {recipients.map((r, i) => (
                <div key={i} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}>{i + 1}</span>
                    <input
                      className="theme-input flex-1 text-xs py-1.5"
                      placeholder="Full name"
                      value={r.name}
                      onChange={e => updateRecipient(i, "name", e.target.value)}
                    />
                    {recipients.length > 1 && (
                      <button onClick={() => removeRecipient(i)} style={{ color: "var(--danger)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pl-7">
                    <input
                      className="theme-input flex-1 text-xs py-1.5"
                      placeholder="Email address"
                      type="email"
                      value={r.email}
                      onChange={e => updateRecipient(i, "email", e.target.value)}
                    />
                    <select
                      className="theme-input text-xs py-1.5"
                      value={r.role}
                      onChange={e => updateRecipient(i, "role", e.target.value)}
                      style={{ minWidth: "90px" }}
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>Sign order:</label>
                    <input
                      type="number"
                      min="1"
                      className="theme-input text-xs py-1 w-16"
                      value={r.routing_order}
                      onChange={e => updateRecipient(i, "routing_order", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>SUBJECT</label>
            <input
              className="theme-input w-full text-sm"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>MESSAGE</label>
            <textarea
              className="theme-input w-full text-sm resize-none"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-xs font-medium px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button size="sm" onClick={handleSend} disabled={sending} style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            {sending ? "Sending…" : "Send for Signature"}
          </Button>
        </div>
      </div>
    </div>
  );
}