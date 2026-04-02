import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import TransactionStatusChecker from "../components/landing/TransactionStatusChecker";
import { createPageUrl } from "@/utils";
import {
  FileText,
  Calendar,
  Zap,
  ShieldCheck,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Users,
  Building2,
  ClipboardList,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    icon: FileText,
    title: "Upload or Forward the Contract",
    text: "Drop in the PSA. The system extracts key dates, identifies contingencies, and builds your timeline.",
  },
  {
    icon: Calendar,
    title: "The System Builds the Transaction",
    text: "Phases, tasks, and timeline are created automatically and synced to your calendar.",
  },
  {
    icon: Zap,
    title: "Execution Happens Automatically",
    text: "Deadlines are monitored, issues flagged, and emails drafted without manual follow-up.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Is Always Visible",
    text: "Missing signatures, documents, and issues are identified before they become problems.",
  },
];

const FEATURES = [
  {
    icon: Clock,
    title: "Contract-Based Deadline Enforcement",
    text: "Deadlines are pulled directly from the contract and tracked automatically. No manual entry. No missed dates.",
    subPoints: ["Inspection", "Financing", "Appraisal", "Closing"],
  },
  {
    icon: ShieldCheck,
    title: "Real-Time Compliance Monitoring",
    text: "The system continuously checks your file for missing signatures, initials, disclosures, and required documents.",
  },
  {
    icon: Zap,
    title: "Automated Transaction Execution",
    text: "Issues are detected, emails are generated, and actions are triggered. Review and send.",
  },
  {
    icon: BarChart3,
    title: "Full Transaction Visibility",
    text: "Everything in one place: timeline, tasks, documents, and communication.",
  },
  {
    icon: CheckCircle,
    title: "Audit Trail & Accountability",
    text: "Every action is logged with timestamps. Know who did what and when.",
  },
];

const USE_CASES = [
  {
    icon: Users,
    title: "For Agents",
    text: "Close more deals without chasing people. Stay ahead of deadlines and keep clients informed.",
  },
  {
    icon: Building2,
    title: "For Teams & Brokers",
    text: "Standardize workflows, maintain compliance, and gain full visibility across transactions.",
  },
  {
    icon: ClipboardList,
    title: "For Transaction Coordinators",
    text: "Handle more volume with less effort. Clear tasks, fewer errors, no manual tracking.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">EliteTC</span>
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={() => base44.auth.redirectToLogin()}
               className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
             >
               Sign In
             </button>
             <Link
               to="/AgentIntake"
               className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
             >
               Start a Transaction
             </Link>
           </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 tracking-wide uppercase">
            Real Estate Transaction Platform
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            The Transaction System<br className="hidden md:block" /> That Doesn't{" "}
            <span className="text-blue-600">Miss Deadlines</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Extracts your contract. Tracks compliance. Executes the process.{" "}
            No chasing emails. No missed contingencies. No surprises.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/AgentIntake"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-slate-900 text-white text-base font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
            >
              Start a Transaction
            </Link>
          </div>
        </div>
      </section>

      <TransactionStatusChecker />

      {/* ── PROBLEM / TRUST ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug mb-10">
            Most deals don't fall apart because of negotiation.{" "}
            <span className="text-slate-400">They fall apart because something gets missed.</span>
          </p>

          <div className="flex flex-col gap-4 text-left max-w-sm mx-auto mb-10">
            {[
              { icon: AlertTriangle, text: "Deadlines slip", color: "text-amber-500", bg: "bg-amber-50" },
              { icon: FileText, text: "Documents are incomplete", color: "text-red-500", bg: "bg-red-50" },
              { icon: Users, text: "No one knows who's responsible", color: "text-slate-500", bg: "bg-slate-100" },
            ].map(({ icon: Icon, text, color, bg }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-slate-700 font-medium">{text}</span>
              </div>
            ))}
          </div>

          <p className="text-lg font-bold text-slate-900">This system removes that risk.</p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Four steps. Fully automated.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step {i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Core Features</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built to execute, not just remind.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isWide = i === FEATURES.length - 1 && FEATURES.length % 2 !== 0;
              return (
                <div
                  key={i}
                  className={`bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${isWide ? "md:col-span-2" : ""}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">{f.text}</p>
                  {f.subPoints && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {f.subPoints.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATION ── */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xl md:text-2xl text-slate-400 font-medium mb-4">
            Most tools remind you what to do.
          </p>
          <p className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            This system makes sure<br className="hidden md:block" /> it gets done.
          </p>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Who It's For</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for every role in the deal.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <div
                  key={u.title}
                  className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{u.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{u.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
            Stop managing transactions manually.
          </h2>
          <p className="text-xl text-slate-500 font-medium mb-10">
            Start running them with a system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/AgentIntake"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-slate-900 text-white text-base font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
            >
              Start a Transaction
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">EliteTC</span>
          </div>
          <p className="text-sm text-slate-400 text-center">
            Built for real estate professionals who don't miss details.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            Sign In →
          </button>
        </div>
      </footer>

    </div>
  );
}