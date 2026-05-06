import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle, Loader2, Trash2 } from "lucide-react";

export default function DeleteAccountModal({ onClose, onExportFirst }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const isConfirmed = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await base44.functions.invoke("deleteUserAccount", {});
      await authApi.logout();
      window.location.href = "/";
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Deletion failed. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Delete Account</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning box */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-800">This action is permanent and cannot be undone.</p>
                <p className="text-sm text-red-700">All transactions, documents, and data will be deleted.</p>
              </div>
            </div>
          </div>

          {/* What gets deleted */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              The following will be permanently deleted:
            </p>
            {[
              "All transactions you created or were assigned to",
              "All documents attached to those transactions",
              "All tasks, notes, and activity logs",
              "Your profile and account credentials",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Export first option */}
          <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3"
            style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Want to save your data first?</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Export a full copy before deleting.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onExportFirst} className="flex-shrink-0 text-xs">
              Export Data
            </Button>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {deleting ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-1.5" /> Delete My Account</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}