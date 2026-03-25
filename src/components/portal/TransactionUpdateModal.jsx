import React, { useState } from "react";
import { X, Key, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TransactionUpdateModal({ onClose }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // null | { found, count } | { error }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("agentCodeLookup", {
        reference_code: code.trim(),
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
    padding: "10px 12px 10px 40px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    fontSize: "15px",
    outline: "none",
    letterSpacing: "0.1em",
    fontFamily: "monospace",
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.3)" }}>
            <Key className="w-5 h-5" style={{ color: "#c9a227" }} />
          </div>
          <h2 className="text-white font-bold text-xl mb-1">View Your Transactions</h2>
          <p className="text-slate-400 text-sm">
            Enter your Agent Reference Code to receive a status update on your active deals.
          </p>
        </div>

        {result?.found === true ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Update Sent!</h3>
            <p className="text-slate-400 text-sm">
              A summary of your <span className="text-white font-semibold">{result.count} active deal{result.count !== 1 ? "s" : ""}</span> has been sent to your email on file.
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
            <h3 className="text-white font-bold text-lg mb-2">
              {result?.reason === "no_transactions" ? "No Active Transactions" : "Code Not Recognized"}
            </h3>
            <p className="text-slate-400 text-sm">
              {result?.reason === "no_transactions"
                ? "Your code was verified, but no active transactions were found."
                : "No agent was found with that reference code. Please check your code and try again."}
            </p>
            <p className="text-slate-500 text-xs mt-2">Contact your TC if you need your Agent Reference Code.</p>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Agent Reference Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. AGT-AB1234"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              <p className="text-slate-600 text-xs mt-1.5">Your code was provided by your Transaction Coordinator.</p>
            </div>

            {result?.error && (
              <p className="text-red-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {result.error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
              style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {loading ? "Looking up your deals…" : "View My Transactions"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}