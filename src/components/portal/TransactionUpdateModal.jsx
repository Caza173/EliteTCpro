import React, { useState } from "react";
import { X, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TransactionUpdateModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // null | { found, count } | { error }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("portalSupport", {
        action: "transaction_update",
        agent_email: email.trim(),
      });
      setResult(res.data);
    } catch (err) {
      const msg = err?.response?.data?.error || "Something went wrong. Please try again.";
      setResult({ error: msg });
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-white font-bold text-xl mb-1">Transaction Update Request</h2>
          <p className="text-slate-400 text-sm">
            Enter the email associated with your deals and we'll send you a status update instantly.
          </p>
        </div>

        {result?.found === true ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Update Sent!</h3>
            <p className="text-slate-400 text-sm">
              A summary of your {result.count} active deal{result.count !== 1 ? "s" : ""} has been sent to <span className="text-white">{email}</span>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            >
              Done
            </button>
          </div>
        ) : result?.found === false ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No Transactions Found</h3>
            <p className="text-slate-400 text-sm">
              No active transactions were found associated with <span className="text-white">{email}</span>.
            </p>
            <p className="text-slate-500 text-xs mt-2">Make sure to use the email on file with your TC.</p>
            <button
              onClick={() => setResult(null)}
              className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Agent Email</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="agent@brokerage.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {result?.error && (
              <p className="text-red-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {result.error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
              style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? "Looking up your deals…" : "Send My Update"}
            </button>

            <p className="text-slate-600 text-xs text-center">Limited to 3 requests per hour per email.</p>
          </form>
        )}
      </div>
    </div>
  );
}