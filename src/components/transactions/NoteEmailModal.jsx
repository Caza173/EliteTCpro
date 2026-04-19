import React, { useState, useEffect, useMemo } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NoteEmailModal({ open, note, transaction, allUsers, currentUser, onClose }) {
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [includeFullNote, setIncludeFullNote] = useState(true);
  const [sending, setSending] = useState(false);

  // Extract @mentioned users from note
  const mentionedUsers = useMemo(() => {
    const mentions = note.message.match(/@(\S+)/g) || [];
    return mentions.map(m => m.slice(1)); // remove @
  }, [note.message]);

  // Auto-fill email from first mentioned user
  useEffect(() => {
    if (mentionedUsers.length > 0 && sendEmail) {
      const firstMention = mentionedUsers[0];
      const matchedUser = allUsers.find(u =>
        (u.full_name || "").toLowerCase().includes(firstMention.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(firstMention.toLowerCase())
      );
      if (matchedUser) {
        setRecipientEmail(matchedUser.email);
      }
    }
  }, [sendEmail, mentionedUsers, allUsers]);

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      alert("Please enter a recipient email");
      return;
    }

    setSending(true);
    try {
      const subject = `Action Needed – ${transaction.address}`;
      const transactionLink = `${window.location.origin}/#/transactions/${transaction.id}`;
      
      const body = `<p>You were mentioned in a transaction note.</p>
<p><strong>Property:</strong> ${transaction.address}</p>
${includeFullNote ? `<p><strong>Message:</strong></p><p>${note.message.replace(/\n/g, "<br>")}</p>` : ""}
<p><a href="${transactionLink}" style="background:#2563EB;color:white;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block;">View Transaction</a></p>`;

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body,
      });

      // Log email sent
      await base44.entities.Note.update(note.id, {
        email_sent: true,
        recipient_email: recipientEmail,
        sent_timestamp: new Date().toISOString(),
      });

      alert("Email sent successfully");
      onClose();
    } catch (err) {
      alert("Failed to send email: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Mail className="w-4 h-4" /> Send Email Notification
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Toggle */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="rounded border-gray-300"
            />
            Send Email Notification
          </label>
        </div>

        {sendEmail && (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
            {/* Recipient Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full rounded border px-2.5 py-1.5 text-xs outline-none transition-colors"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              />
              {mentionedUsers.length > 0 && (
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Mentioned: {mentionedUsers.join(", ")}
                </p>
              )}
            </div>

            {/* Include Full Note */}
            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={includeFullNote}
                onChange={e => setIncludeFullNote(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include full note content
            </label>

            {/* Preview */}
            <div className="p-2.5 rounded border text-xs space-y-1" style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
              <p><strong>Subject:</strong> Action Needed – {transaction.address}</p>
              {includeFullNote && (
                <p><strong>Note:</strong> {note.message.slice(0, 100)}…</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={onClose}
            className="flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          {sendEmail && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 rounded px-3 py-2 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: sending ? "var(--text-muted)" : "var(--accent)", cursor: sending ? "not-allowed" : "pointer" }}
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
              {sending ? "Sending…" : "Send Email"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}