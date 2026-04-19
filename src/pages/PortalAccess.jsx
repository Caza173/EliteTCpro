import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Lock } from "lucide-react";
import { Building2 } from "lucide-react";

export default function PortalAccess() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAccess = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter your portal code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Look up portal access by code
      const results = await base44.entities.PortalAccess.filter({ code: code.trim().toUpperCase() });
      const portalAccess = results?.[0];

      if (!portalAccess) {
        setError("Invalid portal code. Please check and try again.");
        setLoading(false);
        return;
      }

      if (!portalAccess.enabled) {
        setError("This portal code has been disabled. Please contact support.");
        setLoading(false);
        return;
      }

      // Fetch transaction to verify it exists
      const tx = await base44.entities.Transaction.filter({ id: portalAccess.transaction_id });
      if (!tx || tx.length === 0) {
        setError("Transaction not found.");
        setLoading(false);
        return;
      }

      // Log access event
      await base44.entities.AuditLog.create({
        brokerage_id: portalAccess.brokerage_id,
        transaction_id: portalAccess.transaction_id,
        actor_email: "guest",
        action: "portal_accessed",
        entity_type: "portal_access",
        entity_id: portalAccess.id,
        description: `Portal accessed via code entry`,
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => {
        navigate(`/ClientLookup?code=${code.trim().toUpperCase()}`);
      }, 500);
    } catch (err) {
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div
        className="w-full max-w-md rounded-xl border shadow-lg overflow-hidden"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        {/* Header */}
        <div className="px-6 py-8 border-b text-center" style={{ borderColor: "var(--card-border)", background: "var(--bg-secondary)" }}>
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Transaction Portal
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Enter your access code to view transaction details
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Portal access confirmed!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Redirecting to your transaction…</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Access Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAccess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Portal Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your code here"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  disabled={loading || success}
                  className="w-full rounded-lg border px-4 py-3 text-sm outline-none uppercase tracking-widest font-mono transition-colors"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  autoFocus
                />
                <Lock className="absolute right-3 top-3 w-5 h-5" style={{ color: "var(--text-muted)" }} />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                Your code was sent to you via email. It's case-insensitive.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || success || !code.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {loading ? "Verifying…" : success ? "Redirecting…" : "Access Portal"}
            </Button>
          </form>

          {/* Help Section */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
            <p className="text-xs mb-2 font-medium" style={{ color: "var(--text-primary)" }}>
              Can't find your code?
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Check your email inbox or spam folder. If you need help, contact your transaction coordinator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center border-t" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            This portal is secure and protected by encryption.
          </p>
        </div>
      </div>
    </div>
  );
}