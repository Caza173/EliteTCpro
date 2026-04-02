import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, MapPin, CheckCircle2, Clock, AlertTriangle, Calendar, ChevronRight, Loader2, Mail } from "lucide-react";

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing",
];

const PHASE_LABELS = {
  intake: "Intake",
  under_contract: "Under Contract",
  inspection: "Inspection",
  financing: "Financing",
  appraisal: "Appraisal",
  clear_to_close: "Clear to Close",
  closing: "Closing",
  closed: "Closed",
};

function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

function daysUntil(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  return diff;
}

function DeadlineRow({ label, date }) {
  const days = daysUntil(date);
  let urgency = "text-slate-600";
  let badge = null;
  if (days !== null) {
    if (days < 0) { urgency = "text-red-600 font-semibold"; badge = <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 ml-1">OVERDUE</span>; }
    else if (days <= 3) { urgency = "text-red-500 font-semibold"; badge = <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 ml-1">{days}d</span>; }
    else if (days <= 7) { urgency = "text-amber-600"; badge = <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 ml-1">{days}d</span>; }
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className={`text-sm ${urgency}`}>
        {formatDate(date)}{badge}
      </span>
    </div>
  );
}

export default function TransactionStatusChecker() {
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const CODE_PATTERN = /^TC-\d{4}-[A-Z0-9]{4}$/i;

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    if (!CODE_PATTERN.test(code.trim())) {
      setError("invalid_format");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setRequestSent(false);

    try {
      // Search by client_access_code
      const all = await base44.entities.Transaction.list("-updated_date", 500);
      const matches = all.filter(tx =>
        tx.client_access_code?.toLowerCase() === code.trim().toLowerCase()
      );

      if (matches.length === 0) {
        setError("no_transaction");
        setLoading(false);
        return;
      }

      const tx = matches[0];

      // Optional contact verification
      if (contact.trim()) {
        const c = contact.trim().toLowerCase();
        const emails = [tx.client_email, tx.agent_email, ...(tx.client_emails || [])].filter(Boolean).map(e => e.toLowerCase());
        const phones = [tx.client_phone].filter(Boolean).map(p => p.replace(/\D/g, ""));
        const inputPhone = c.replace(/\D/g, "");
        const emailMatch = emails.some(e => e.includes(c));
        const phoneMatch = inputPhone.length >= 7 && phones.some(p => p.includes(inputPhone));
        if (!emailMatch && !phoneMatch) {
          setError("verification_failed");
          setLoading(false);
          return;
        }
      }

      // Build safe public result (no financials, no full docs)
      const phase = tx.phase || 1;
      const phasesCompleted = tx.phases_completed || [];
      const progressPct = Math.round((phasesCompleted.length / 12) * 100);

      // Health / status
      const now = new Date();
      const deadlines = [tx.inspection_deadline, tx.financing_deadline, tx.appraisal_deadline, tx.closing_date].filter(Boolean);
      const hasOverdue = deadlines.some(d => new Date(d) < now && d !== tx.closing_date);
      const hasSoon = deadlines.some(d => { const days = daysUntil(d); return days !== null && days >= 0 && days <= 5; });

      const statusFlag = hasOverdue ? "at_risk" : hasSoon ? "watch" : (tx.risk_level || "on_track");

      setResult({
        address: tx.address,
        phase,
        phaseName: PHASES[phase - 1] || "In Progress",
        transactionPhase: PHASE_LABELS[tx.transaction_phase] || tx.transaction_phase || "Active",
        status: tx.status || "active",
        statusFlag,
        progressPct,
        phasesCompleted: phasesCompleted.length,
        inspection_deadline: tx.inspection_deadline,
        financing_deadline: tx.financing_deadline,
        appraisal_deadline: tx.appraisal_deadline,
        closing_date: tx.closing_date,
        agent_email: tx.agent_email,
        last_activity_at: tx.last_activity_at || tx.updated_date,
        transaction_id: tx.id,
      });
    } catch {
      setError("no_transaction");
    }
    setLoading(false);
  };

  const handleRequestUpdate = async () => {
    if (!result?.agent_email) return;
    setRequesting(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: result.agent_email,
        subject: `Transaction Update Request — ${result.address}`,
        body: `A client or party on the transaction at ${result.address} has requested a status update through the EliteTC portal. Please provide a brief update at your earliest convenience.${contact ? `\n\nContact info provided: ${contact}` : ""}`,
        from_name: "EliteTC Client Portal",
      });
      setRequestSent(true);
    } catch {}
    setRequesting(false);
  };

  const statusConfig = {
    on_track: { label: "On Track", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    watch: { label: "Needs Attention", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    at_risk: { label: "At Risk", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  };

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Check Your Transaction Status</h2>
            </div>
            <p className="text-slate-400 text-sm ml-12">Enter your transaction code to see real-time status — no login required.</p>
          </div>

          {/* Search Form */}
          <div className="px-8 py-6 border-b border-slate-100">
            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="Enter your transaction code (e.g. TC-2026-A7F3)"
                  className={`w-full pl-10 pr-4 h-11 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${error === "invalid_format" ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"}`}
                />
              </div>
              <div className="sm:w-64 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Email or phone (optional)"
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Check Status
              </button>
            </form>
          </div>

          {/* Error States */}
          {error === "invalid_format" && (
            <div className="px-8 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Invalid Code Format</p>
              <p className="text-sm text-slate-400">Please enter a valid transaction code in the format <span className="font-mono font-semibold text-slate-600">TC-YYYY-XXXX</span> (e.g. TC-2026-A7F3).</p>
            </div>
          )}

          {error === "no_transaction" && (
            <div className="px-8 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">No Transaction Found</p>
              <p className="text-sm text-slate-400">Try searching by the full property address or contact your TC for your transaction ID.</p>
            </div>
          )}

          {error === "verification_failed" && (
            <div className="px-8 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Verification Failed</p>
              <p className="text-sm text-slate-400">The contact info you entered doesn't match our records for this transaction. Please double-check or leave it blank.</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="px-8 py-6 space-y-6">

              {/* Address + Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{result.address}</h3>
                  </div>
                  <p className="text-xs text-slate-400 ml-6">
                    Phase {result.phase} of 12 · {result.phaseName}
                    {result.last_activity_at && ` · Last update: ${formatDate(result.last_activity_at)}`}
                  </p>
                </div>
                {(() => {
                  const cfg = statusConfig[result.statusFlag] || statusConfig.on_track;
                  const Icon = cfg.icon;
                  return (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${cfg.bg} ${cfg.border} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction Progress</span>
                  <span className="text-xs font-bold text-slate-700">{result.phasesCompleted}/12 phases</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                    style={{ width: `${Math.max(4, result.progressPct)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-slate-400">Pre-Contract</span>
                  <span className="text-[10px] text-slate-400">Closed</span>
                </div>
              </div>

              {/* Current Phase Badge */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Current Stage</p>
                  <p className="text-base font-bold text-blue-900">{result.transactionPhase}</p>
                </div>
              </div>

              {/* Key Dates */}
              {(result.inspection_deadline || result.financing_deadline || result.appraisal_deadline || result.closing_date) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Dates</p>
                  <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                    {result.inspection_deadline && <DeadlineRow label="Inspection Deadline" date={result.inspection_deadline} />}
                    {result.financing_deadline && <DeadlineRow label="Financing Deadline" date={result.financing_deadline} />}
                    {result.appraisal_deadline && <DeadlineRow label="Appraisal Deadline" date={result.appraisal_deadline} />}
                    {result.closing_date && <DeadlineRow label="Closing Date" date={result.closing_date} />}
                  </div>
                </div>
              )}

              {/* Request Update */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">Need more details? Send a request to your transaction coordinator.</p>
                {requestSent ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Update requested!
                  </div>
                ) : (
                  <button
                    onClick={handleRequestUpdate}
                    disabled={requesting || !result.agent_email}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
                  >
                    {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Request Update
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}