import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, CheckCircle2, Clock, Search, Building2 } from "lucide-react";
import { format } from "date-fns";

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

const DEADLINES = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit" },
  { key: "inspection_deadline", label: "Inspection Deadline" },
  { key: "due_diligence_deadline", label: "Due Diligence" },
  { key: "appraisal_deadline", label: "Appraisal Deadline" },
  { key: "financing_deadline", label: "Financing Commitment" },
  { key: "closing_date", label: "Closing Date" },
];

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return format(d, "MMMM d, yyyy");
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

export default function ClientLookup() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transaction, setTransaction] = useState(null);

  const handleLookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setTransaction(null);
    try {
      const res = await base44.functions.invoke("clientLookup", { code: code.trim() });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setTransaction(res.data);
      }
    } catch (e) {
      setError("Something went wrong. Please check your code and try again.");
    }
    setLoading(false);
  };

  const currentPhaseNum = transaction?.phase || 1;
  const phasesCompleted = transaction?.phases_completed || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F172A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-sm">EliteTC — Transaction Status</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">

          {/* Lookup Card */}
          <div className="rounded-2xl p-8 text-center space-y-5" style={{ background: "#1E293B", border: "1px solid #334155" }}>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Check Your Transaction</h1>
              <p className="text-slate-400 text-sm">Enter the access code from your email to view your transaction status and key dates.</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your access code (e.g. TC-A1B2C3)"
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

          {/* Transaction Result */}
          {transaction && (
            <div className="space-y-4">
              {/* Address + Status */}
              <div className="rounded-2xl p-6 space-y-3" style={{ background: "#1E293B", border: "1px solid #334155" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{transaction.address}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
              </div>

              {/* Phase Progress */}
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "#1E293B", border: "1px solid #334155" }}>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Progress</h3>
                <div className="space-y-2">
                  {PHASES.map((phaseName, idx) => {
                    const phaseNum = idx + 1;
                    const isCompleted = phasesCompleted.includes(phaseNum);
                    const isCurrent = phaseNum === currentPhaseNum && !isCompleted;
                    return (
                      <div key={phaseNum} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isCompleted ? "bg-emerald-500" : isCurrent ? "bg-blue-600" : "bg-slate-700"
                        }`}>
                          {isCompleted
                            ? <CheckCircle2 className="w-4 h-4 text-white" />
                            : <span className={isCurrent ? "text-white" : "text-slate-500"}>{phaseNum}</span>
                          }
                        </div>
                        <span className={`text-sm ${isCompleted ? "text-emerald-400" : isCurrent ? "text-white font-medium" : "text-slate-500"}`}>
                          {phaseName}
                          {isCurrent && <span className="ml-2 text-xs text-blue-400">(Current)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Deadlines */}
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "#1E293B", border: "1px solid #334155" }}>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Key Deadlines</h3>
                <div className="space-y-3">
                  {DEADLINES.map(({ key, label }) => {
                    const dateStr = transaction[key];
                    if (!dateStr) return null;
                    const days = daysUntil(dateStr);
                    const isOverdue = days < 0;
                    const isUrgent = days >= 0 && days <= 3;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-300">{label}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${isOverdue ? "text-red-400" : isUrgent ? "text-amber-400" : "text-white"}`}>
                            {formatDate(dateStr)}
                          </p>
                          {days !== null && (
                            <p className={`text-xs ${isOverdue ? "text-red-500" : isUrgent ? "text-amber-500" : "text-slate-500"}`}>
                              {isOverdue ? `${Math.abs(days)} days overdue` : days === 0 ? "Today" : `${days} days away`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {DEADLINES.every(({ key }) => !transaction[key]) && (
                    <p className="text-slate-500 text-sm">No deadlines set yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}