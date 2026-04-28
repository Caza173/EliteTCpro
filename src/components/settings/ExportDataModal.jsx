import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2, CheckCircle, FileJson, AlertCircle } from "lucide-react";

export default function ExportDataModal({ onClose, onExportDone }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setStatus("loading");
    setError(null);
    try {
      const r = await base44.functions.invoke("exportUserData", {});
      const data = r.data;
      if (!data?.ok) throw new Error(data?.error || "Export failed");
      setResult(data);
      setStatus("done");
      if (onExportDone) onExportDone();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Export failed. Please try again.");
      setStatus("error");
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.12)" }}>
              <Download className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Export My Data</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {status === "idle" && (
            <>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Your data export will be generated and available for download. The link expires in 24 hours.
              </p>
              <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Included in your export:
                </p>
                {[
                  "Profile & account info",
                  "All transactions you own or are assigned to",
                  "Tasks, notes, and activity logs",
                  "Document metadata (filenames, types, links)",
                  "Audit log entries",
                  "In-app notifications",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <FileJson className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                    {item}
                  </div>
                ))}
              </div>
            </>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--accent)" }} />
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preparing your data…</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>This may take a moment for large accounts.</p>
              </div>
            </div>
          )}

          {status === "done" && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Your export is ready!</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Link expires in 24 hours.</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Transactions", value: result.stats?.transactions ?? 0 },
                  { label: "Tasks", value: result.stats?.tasks ?? 0 },
                  { label: "Documents", value: result.stats?.documents ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2" style={{ background: "var(--bg-tertiary)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                  </div>
                ))}
              </div>

              <a href={result.download_url} download target="_blank" rel="noreferrer">
                <Button className="w-full gap-2" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  <Download className="w-4 h-4" /> Download Export
                </Button>
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center py-6 gap-3">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-red-700">Export failed</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>Try Again</Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "idle" && (
          <div className="px-5 pb-5 flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleExport} className="flex-1 gap-2" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              <Download className="w-4 h-4" /> Generate Export
            </Button>
          </div>
        )}

        {(status === "done" || status === "error") && (
          <div className="px-5 pb-5">
            <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}