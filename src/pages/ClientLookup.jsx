import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Calendar, CheckCircle2, Clock, Search,
  Building2, MessageSquarePlus, Send, Pin, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing",
];

const PHASE_LABELS = {
  intake: "Intake", under_contract: "Under Contract", inspection: "Inspection",
  financing: "Financing", appraisal: "Appraisal", clear_to_close: "Clear to Close",
  closing: "Closing", closed: "Closed",
};

const DEADLINES = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit" },
  { key: "inspection_deadline",    label: "Inspection Deadline" },
  { key: "due_diligence_deadline", label: "Due Diligence" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline" },
  { key: "financing_deadline",     label: "Financing Commitment" },
  { key: "closing_date",           label: "Closing Date" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : format(dt, "MMMM d, yyyy");
}

function daysUntil(d) {
  if (!d) return null;
  const dt = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((dt - today) / 86400000);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBar({ transaction }) {
  const phasesCompleted = transaction.phases_completed || [];
  const currentPhase = transaction.phase || 1;
  const completedCount = phasesCompleted.length;
  const pct = Math.round((completedCount / PHASES.length) * 100);

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "#1E293B", border: "1px solid #334155" }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white leading-tight">{transaction.address}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-700 capitalize">
              {transaction.status || "active"}
            </Badge>
            {transaction.transaction_phase && (
              <Badge className="text-xs bg-blue-900/50 text-blue-300 border border-blue-700">
                {PHASE_LABELS[transaction.transaction_phase] || transaction.transaction_phase}
              </Badge>
            )}
            {transaction.is_cash_transaction && (
              <Badge className="text-xs bg-amber-900/50 text-amber-300 border border-amber-700">Cash</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "#94A3B8" }}>
          <span>Transaction Progress</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#334155" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#3B82F6" }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>
          {completedCount} of {PHASES.length} phases complete
          {currentPhase <= PHASES.length && ` · Currently: ${PHASES[currentPhase - 1]}`}
        </p>
      </div>
    </div>
  );
}

function KeyDates({ transaction }) {
  const hasAny = DEADLINES.some(({ key }) => transaction[key]);
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#1E293B", border: "1px solid #334155" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Key Dates</h3>
      {!hasAny ? (
        <p className="text-sm" style={{ color: "#475569" }}>No key dates set yet.</p>
      ) : (
        <div className="space-y-2.5">
          {DEADLINES.map(({ key, label }) => {
            const dateStr = transaction[key];
            if (!dateStr) return null;
            const days = daysUntil(dateStr);
            const isOverdue = days < 0;
            const isUrgent = days >= 0 && days <= 3;
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#475569" }} />
                  <span className="text-sm truncate" style={{ color: "#CBD5E1" }}>{label}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-400" : isUrgent ? "text-amber-400" : "text-white"}`}>
                    {formatDate(dateStr)}
                  </p>
                  {days !== null && (
                    <p className={`text-xs ${isOverdue ? "text-red-500" : isUrgent ? "text-amber-500" : "text-slate-500"}`}>
                      {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d away`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Timeline({ transaction }) {
  const phasesCompleted = transaction.phases_completed || [];
  const currentPhase = transaction.phase || 1;
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#1E293B", border: "1px solid #334155" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Phase Timeline</h3>
      <div className="space-y-2">
        {PHASES.map((name, idx) => {
          const num = idx + 1;
          const isCompleted = phasesCompleted.includes(num);
          const isCurrent = num === currentPhase && !isCompleted;
          return (
            <div key={num} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                isCompleted ? "bg-emerald-500" : isCurrent ? "bg-blue-600" : "bg-slate-700"
              }`}>
                {isCompleted
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  : <span className={isCurrent ? "text-white" : "text-slate-500"}>{num}</span>
                }
              </div>
              <span className={`text-sm ${isCompleted ? "text-emerald-400" : isCurrent ? "text-white font-medium" : "text-slate-500"}`}>
                {name}
                {isCurrent && <span className="ml-2 text-xs text-blue-400">(Current)</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotesSection({ transaction, agentCode }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const notes = transaction.notes || [];

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("portalAddNote", {
        agent_code: agentCode,
        transaction_id: transaction.transaction_id,
        message: message.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessage("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      setError(e.message || "Failed to submit note.");
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "#1E293B", border: "1px solid #334155" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
        Notes &amp; Updates
      </h3>

      {/* Existing shared notes */}
      {notes.length === 0 ? (
        <p className="text-sm" style={{ color: "#475569" }}>No shared notes yet.</p>
      ) : (
        <div className="space-y-2.5">
          {notes.map(note => (
            <div key={note.id}
              className="rounded-lg px-3 py-2.5"
              style={{
                background: note.is_pinned ? "rgba(37,99,235,0.08)" : "#0F172A",
                border: `1px solid ${note.is_pinned ? "#3B82F6" : "#1E293B"}`,
              }}>
              <div className="flex items-center gap-2 mb-1">
                {note.is_pinned && <Pin className="w-3 h-3 text-blue-400" />}
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>
                  {note.created_by_name || "TC"}
                </span>
                {note.created_date && (
                  <span className="text-[10px]" style={{ color: "#475569" }}>
                    · {format(new Date(note.created_date), "MMM d")}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#CBD5E1" }}>
                {note.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add note form */}
      <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#334155" }}>
        <p className="text-xs font-medium" style={{ color: "#64748B" }}>Add a note to your TC</p>
        <textarea
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
          style={{ background: "#0F172A", border: "1px solid #334155", color: "#E2E8F0" }}
          rows={3}
          placeholder="Type your note here…"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {submitted && <p className="text-emerald-400 text-xs">Note submitted successfully!</p>}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Submitting…" : "Submit Note"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientLookup() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { role, ...transactionData }

  const handleLookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await base44.functions.invoke("portalLookup", { code: code.trim() });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch {
      setError("Something went wrong. Please check your code and try again.");
    }
    setLoading(false);
  };

  const isAgent = result?.role === "agent";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F172A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-sm">EliteTC — Transaction Portal</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-5">

          {/* Lookup card */}
          <div className="rounded-2xl p-8 text-center space-y-5" style={{ background: "#1E293B", border: "1px solid #334155" }}>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Transaction Status Portal</h1>
              <p className="text-sm" style={{ color: "#94A3B8" }}>
                Enter your access code to view your transaction.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your access code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                className="text-center font-mono text-lg tracking-widest"
                style={{ background: "#0F172A", border: "1px solid #334155", color: "white" }}
              />
              <Button onClick={handleLookup} disabled={loading || !code.trim()} className="bg-blue-600 hover:bg-blue-700 px-5">
                {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Role badge */}
              <div className="flex items-center gap-2 px-1">
                <div className={`w-2 h-2 rounded-full ${isAgent ? "bg-blue-400" : "bg-emerald-400"}`} />
                <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>
                  Viewing as: <span className="text-white font-semibold capitalize">{result.role}</span>
                </span>
              </div>

              {/* Status bar — both views */}
              <StatusBar transaction={result} />

              {/* Key dates — both views */}
              <KeyDates transaction={result} />

              {/* Timeline — agent only */}
              {isAgent && <Timeline transaction={result} />}

              {/* Notes — agent only */}
              {isAgent && <NotesSection transaction={result} agentCode={code.trim()} />}

              {/* Client footer */}
              {!isAgent && (
                <p className="text-center text-xs px-4" style={{ color: "#475569" }}>
                  Questions? Contact your transaction coordinator directly.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}