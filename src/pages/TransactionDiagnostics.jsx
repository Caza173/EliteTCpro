/**
 * Transaction Intelligence Diagnostics
 * Admin-only panel for inspecting the engine output for any transaction.
 * Shows full structured insights with verbose logs.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { buildTransactionInsights } from "@/lib/engine/index.js";
import {
  CheckCircle2, AlertTriangle, Clock, ShieldX, FileText,
  Zap, ChevronDown, ChevronRight, RefreshCw, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const RISK_COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#d2a35f",
  low:      "#22c55e",
};

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border mb-3" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color: "#d2a35f" }} />}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function JsonBlock({ data }) {
  return (
    <pre className="text-[11px] rounded-lg p-3 overflow-auto max-h-64 font-mono"
      style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg" style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-lg font-bold font-mono" style={{ color: color || "var(--text-primary)" }}>{String(value ?? "—")}</span>
    </div>
  );
}

export default function TransactionDiagnostics() {
  const [search,     setSearch]     = useState("");
  const [selectedTx, setSelectedTx] = useState(null);
  const [insights,   setInsights]   = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [running,    setRunning]    = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["all-transactions-diag"],
    queryFn:  () => base44.entities.Transaction.list("-updated_date", 50),
    staleTime: 60_000,
  });

  const filtered = transactions.filter(tx =>
    !search || (tx.address || "").toLowerCase().includes(search.toLowerCase())
  );

  const runDiagnostics = async (tx) => {
    setSelectedTx(tx);
    setInsights(null);
    setLogs([]);
    setRunning(true);

    const log = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    try {
      log(`Loading data for: ${tx.address}`);

      const [tasks, checklist, documents, complianceReports] = await Promise.all([
        base44.entities.TransactionTask.filter({ transaction_id: tx.id }),
        base44.entities.DocumentChecklistItem.filter({ transaction_id: tx.id }),
        base44.entities.Document.filter({ transaction_id: tx.id }),
        base44.entities.ComplianceReport.filter({ transaction_id: tx.id }),
      ]);

      log(`Loaded: ${tasks.length} tasks, ${checklist.length} checklist items, ${documents.length} docs, ${complianceReports.length} compliance reports`);
      log("Running Transaction Intelligence Engine...");

      const result = buildTransactionInsights(tx, { tasks, checklist, documents, complianceReports });

      log(`Engine complete. Risk: ${result.riskLevel} (score: ${result.riskScore})`);
      log(`Alerts: ${result.alerts.length} | Compliance issues: ${result.complianceIssues.length}`);
      log(`Overdue deadlines: ${result.overdueDeadlines.length} | Missing docs: ${result.missingDocCount}`);
      log(`Phase: ${result.phaseLabel} (${result.phaseProgress}% complete)`);
      log(`Days until closing: ${result.daysUntilClosing ?? "N/A"}`);
      log("✅ Diagnostics complete.");

      setInsights(result);
    } catch (err) {
      log(`❌ ERROR: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif" style={{ color: "var(--text-primary)" }}>
          Transaction Intelligence Diagnostics
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Admin tool — inspect the deterministic engine output for any transaction.
        </p>
        <div className="h-px mt-3" style={{ background: "linear-gradient(90deg, #d2a35f, transparent)", opacity: 0.3 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Transaction List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search address..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-none">
              {isLoading && <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Loading...</p>}
              {filtered.map(tx => (
                <button
                  key={tx.id}
                  onClick={() => runDiagnostics(tx)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all"
                  style={selectedTx?.id === tx.id
                    ? { background: "rgba(210,163,95,0.12)", color: "#d2a35f", border: "1px solid rgba(210,163,95,0.25)" }
                    : { color: "var(--text-secondary)", border: "1px solid transparent" }
                  }
                  onMouseEnter={e => { if (selectedTx?.id !== tx.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (selectedTx?.id !== tx.id) e.currentTarget.style.background = ""; }}
                >
                  <div className="font-medium truncate">{tx.address || "—"}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="opacity-60 capitalize">{tx.status}</span>
                    <span className="opacity-40">·</span>
                    <span className="opacity-60 capitalize">{tx.transaction_type || "buyer"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnostics Panel */}
        <div className="lg:col-span-2">
          {running && (
            <div className="rounded-xl border p-6 text-center" style={{ borderColor: "rgba(210,163,95,0.2)", background: "rgba(210,163,95,0.04)" }}>
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "#d2a35f" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Running engine...</p>
              <div className="mt-4 space-y-1 text-left max-h-40 overflow-y-auto">
                {logs.map((l, i) => (
                  <p key={i} className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{l}</p>
                ))}
              </div>
            </div>
          )}

          {!running && !insights && (
            <div className="rounded-xl border p-12 text-center" style={{ borderColor: "var(--border)" }}>
              <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(210,163,95,0.4)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select a transaction to run diagnostics.</p>
            </div>
          )}

          {!running && insights && (
            <div className="space-y-0">
              {/* Summary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Metric label="Risk Level"       value={insights.riskLevel.toUpperCase()} color={RISK_COLORS[insights.riskLevel]} />
                <Metric label="Risk Score"       value={insights.riskScore} />
                <Metric label="Phase Progress"   value={`${insights.phaseProgress}%`} color="#d2a35f" />
                <Metric label="Days to Close"    value={insights.daysUntilClosing ?? "N/A"} color={insights.daysUntilClosing !== null && insights.daysUntilClosing <= 7 ? "#ef4444" : undefined} />
                <Metric label="Alerts"           value={insights.alerts.length} color={insights.alerts.length > 0 ? "#ef4444" : "#22c55e"} />
                <Metric label="Compliance Issues" value={insights.complianceIssues.length} />
                <Metric label="Missing Docs"     value={insights.missingDocCount} color={insights.missingDocCount > 0 ? "#f97316" : undefined} />
                <Metric label="Overdue"          value={insights.overdueDeadlines.length} color={insights.overdueDeadlines.length > 0 ? "#ef4444" : undefined} />
              </div>

              <Section title="Phase State" icon={CheckCircle2} defaultOpen>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div><span style={{ color: "var(--text-muted)" }}>Current Phase:</span> <span style={{ color: "var(--text-primary)" }} className="font-medium">{insights.phaseLabel}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Progress:</span> <span style={{ color: "#d2a35f" }} className="font-medium">{insights.phaseProgress}%</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>EMD Status:</span> <span style={{ color: "var(--text-primary)" }}>{insights.emdStatus}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Financing:</span> <span style={{ color: "var(--text-primary)" }}>{insights.financingStatus}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Inspection:</span> <span style={{ color: "var(--text-primary)" }}>{insights.inspectionStatus}</span></div>
                </div>
                {insights.nextAction && (
                  <p className="text-xs p-2 rounded-lg" style={{ background: "rgba(210,163,95,0.08)", color: "#d2a35f", border: "1px solid rgba(210,163,95,0.2)" }}>
                    ⚡ Next Action: {insights.nextAction}
                  </p>
                )}
              </Section>

              <Section title={`Alerts (${insights.alerts.length})`} icon={AlertTriangle} defaultOpen={insights.alerts.length > 0}>
                {insights.alerts.length === 0
                  ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>No alerts.</p>
                  : <div className="space-y-2">
                    {insights.alerts.map(a => (
                      <div key={a.id} className="text-xs p-2 rounded-lg flex gap-2 items-start"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <span className="font-mono opacity-50 flex-shrink-0">[{a.source}]</span>
                        <span style={{ color: "var(--text-primary)" }}>{a.message}</span>
                      </div>
                    ))}
                  </div>
                }
              </Section>

              <Section title={`Deadlines (${insights.allDeadlines?.length || 0})`} icon={Clock}>
                <JsonBlock data={insights.allDeadlines} />
              </Section>

              <Section title={`Compliance Issues (${insights.complianceIssues.length})`} icon={ShieldX}>
                <JsonBlock data={insights.complianceIssues} />
              </Section>

              <Section title={`Documents (${insights.uploadedDocuments.length} uploaded, ${insights.missingDocCount} missing)`} icon={FileText}>
                <JsonBlock data={{ missing: insights.missingDocuments, uploaded: insights.uploadedDocuments.map(d => d.fileName) }} />
              </Section>

              <Section title={`Risk Profile`} icon={Zap}>
                <JsonBlock data={{ riskLevel: insights.riskLevel, riskScore: insights.riskScore, riskFactors: insights.riskFactors }} />
              </Section>

              <Section title="Engine Log">
                <div className="space-y-0.5">
                  {logs.map((l, i) => (
                    <p key={i} className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{l}</p>
                  ))}
                </div>
              </Section>

              <Section title="Full Insights JSON">
                <JsonBlock data={{ ...insights, _engines: undefined }} />
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}