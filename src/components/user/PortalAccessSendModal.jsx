import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";

export default function PortalAccessSendModal({ open, portalAccess, transaction, currentUser, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const portalLink = `${window.location.origin}/#/portal-access`;

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setSending(true);
    setError("");

    try {
      // Send email
      await base44.integrations.Core.SendEmail({
        to: email.trim(),
        subject: "Access Your Transaction Portal",
        body: `<p>You can view your transaction details using the secure portal below.</p>
<p><strong>Portal Code:</strong> <span style="font-family: monospace; font-size: 16px; letter-spacing: 2px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${portalAccess.code}</span></p>
<p><strong>Access Link:</strong><br />
<a href="${portalLink}" style="color: #2563EB; text-decoration: none;">Open Transaction Portal</a></p>
<p style="color: #666; font-size: 13px;">If you have issues, reply to this email.</p>`,
      });

      // Update portal access record
      await base44.entities.PortalAccess.update(portalAccess.id, {
        last_sent_at: new Date().toISOString(),
        last_sent_to: email.trim(),
      });

      // Log audit event
      await base44.entities.AuditLog.create({
        brokerage_id: transaction.brokerage_id,
        transaction_id: transaction.id,
        actor_email: currentUser?.email,
        action: "portal_code_sent",
        entity_type: "portal_access",
        entity_id: portalAccess.id,
        description: `Portal access code sent to ${email.trim()}`,
      }).catch(() => {});

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="rounded-xl border p-6 w-full max-w-sm shadow-lg"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Send Portal Access
          </h3>
          <button
            onClick={onClose}
            disabled={sending}
            className="p-1 rounded hover:bg-gray-100"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Send to Email
            </label>
            <input
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={sending}
              className="w-full rounded border px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-2">Portal Details:</p>
            <p className="text-xs text-blue-800 mb-1">
              <span className="font-semibold">Code:</span> {portalAccess.code}
            </p>
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Transaction:</span> {transaction.address}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}