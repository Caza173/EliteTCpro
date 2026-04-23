import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Building2, ArrowRight, Upload, Clock, ShieldCheck, Send,
  Users, LayoutDashboard, CheckCircle2, Bell, AlertTriangle,
  ClipboardCheck, Zap, Lock, FileText,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [brokerageLogo, setBrokerageLogo] = useState(null);

  useEffect(() => {
    base44.entities.Brokerage.list().then((results) => {
      const logo = results?.[0]?.branding_logo;
      if (logo) setBrokerageLogo(logo);
    }).catch(() => {});
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 h-14 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          {brokerageLogo ? (
            <img src={brokerageLogo} alt="Logo" className="h-12 max-w-[200px] object-contain" />
          ) : (
            <img src="https://media.base44.com/images/public/69a9cd0677a8832ab0cc59bc/9c93e25bf_EliteTCLogoBGRemoved.png" alt="EliteTC Logo" className="h-20 max-w-[300px] object-contain mix-blend-mode-multiply" style={{ mixBlendMode: 'multiply' }} />
          )}
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollTo("features")} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</button>
          <button onClick={() => scrollTo("how-it-works")} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How It Works</button>
          <button onClick={() => scrollTo("pricing")} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => base44.auth.redirectToLogin("/Dashboard")}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate("/AgentIntake?agent=1")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden min-h-[88vh]">
        {/* Background with logo color theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-blue-900/80 to-slate-950/95" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
             {brokerageLogo ? (
               <img src={brokerageLogo} alt="Logo" className="h-16 max-w-[240px] object-contain brightness-0 invert" />
             ) : (
               <img src="https://media.base44.com/images/public/69a9cd0677a8832ab0cc59bc/9c93e25bf_EliteTCLogoBGRemoved.png" alt="EliteTC Logo" className="h-80 max-w-[800px] object-contain" />
             )}
           </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Every Deadline. Every Document.<br />
            <span className="text-blue-400">Automatically Managed.</span>
          </h1>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            EliteTC replaces spreadsheets, Dotloop, and manual TC processes with one automated system — from contract upload to close.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate("/AgentIntake?agent=1")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 transition-colors"
            >
              Start a Transaction <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/ClientLookup")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border border-white/40 hover:border-white/80 hover:bg-white/10 transition-colors"
            >
              Check Transaction Status
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            {[
              { icon: Zap, label: "Auto contract parsing" },
              { icon: ShieldCheck, label: "Built-in compliance engine" },
              { icon: Clock, label: "Real-time deadline tracking" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-blue-400" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating dashboard preview */}
        <div className="relative z-10 mt-16 w-full max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-gray-400 font-mono">app.elitetc.io/transactions/742-elm-street</span>
            </div>
            {/* Dashboard content */}
            <div className="p-5 bg-white">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">742 Elm Street, Portland, OR</p>
                  <p className="text-xs text-gray-400">Buyer Transaction · Under Contract</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">At Risk</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">Score 82%</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Sale Price", val: "$415,000", note: "Buyer" },
                  { label: "Inspection", val: "Apr 10", note: "3 days left", urgent: true },
                  { label: "Financing", val: "Apr 22", note: "15 days left" },
                  { label: "Closing", val: "Apr 30", note: "23 days left" },
                ].map(({ label, val, note, urgent }) => (
                  <div key={label} className={`rounded-xl p-3 border ${urgent ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${urgent ? "text-red-600" : "text-gray-900"}`}>{val}</p>
                    <p className={`text-[10px] mt-0.5 ${urgent ? "text-red-500" : "text-gray-400"}`}>{note}</p>
                  </div>
                ))}
              </div>

              {/* Alerts + tasks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700"><span className="font-semibold text-red-600">Missing document:</span> Signed inspection report</p>
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <Bell className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700"><span className="font-semibold text-amber-600">Addendum likely needed</span> — inspection in 3 days</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { t: "Earnest money confirmed", done: true },
                    { t: "Inspection scheduled", done: true },
                    { t: "Order appraisal", done: false },
                    { t: "Submit financing docs", done: false },
                  ].map(({ t, done }) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border flex items-center justify-center ${done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                        {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-xs ${done ? "line-through text-gray-400" : "text-gray-700"}`}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for how TCs actually work</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              No more spreadsheets and fragmented tools. EliteTC handles the entire transaction so you can focus on closing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Upload,
                label: "Contract Data Extraction",
                desc: "Upload a Purchase & Sales agreement and EliteTC automatically pulls out buyer, seller, deadlines, deposits, and contingencies — no manual entry.",
              },
              {
                icon: Clock,
                label: "Deadline & Contingency Tracking",
                desc: "Every deadline is tracked with real-time countdowns and automatic alerts. Overdue items surface immediately so nothing slips through.",
              },
              {
                icon: ShieldCheck,
                label: "Compliance & Risk Detection",
                desc: "Continuously scans for missing signatures, expired contingencies, incomplete disclosures, and required documents before they become blockers.",
              },
              {
                icon: Send,
                label: "Automated Transaction Emails",
                desc: "Generates under-contract emails to buyers, sellers, lenders, and title companies directly from contract data — reviewed and sent in one click.",
              },
              {
                icon: LayoutDashboard,
                label: "Transaction Pipeline Dashboard",
                desc: "Health scores, risk flags, and overdue alerts across every active deal. Know where every transaction stands at a glance.",
              },
              {
                icon: Users,
                label: "Role-Based Access & Portals",
                desc: "TCs, agents, and clients each get a tailored view. Clients track their deal status with a simple code — no login required.",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-4 p-6 rounded-2xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">From upload to close — in six steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "01", color: "bg-blue-600",   icon: Upload,         title: "Upload Agreement",          desc: "Upload a Purchase & Sales or listing agreement in any format." },
              { num: "02", color: "bg-violet-600",  icon: Zap,            title: "Extract Key Data",          desc: "System identifies parties, deadlines, deposits, contingencies, and key terms automatically." },
              { num: "03", color: "bg-amber-500",   icon: ClipboardCheck, title: "Generate Timeline & Tasks", desc: "Builds a full transaction timeline with every required action and task assigned." },
              { num: "04", color: "bg-red-500",     icon: Bell,           title: "Monitor & Alert",           desc: "Tracks every deadline in real time and flags risks before they become problems." },
              { num: "05", color: "bg-emerald-600", icon: Send,           title: "Automate Communication",    desc: "Generates emails to buyers, sellers, lenders, and title — auto-populated from contract data." },
              { num: "06", color: "bg-blue-600",    icon: ShieldCheck,    title: "Close with Confidence",     desc: "All documents, deadlines, and compliance requirements verified before closing day." },
            ].map(({ num, color, icon: Icon, title, desc }) => (
              <div key={num} className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${color}`}>
                  {num}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA FOOTER ── */}
      <section className="py-24 px-6 bg-gray-950 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to replace your current process?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            One system. Every deadline tracked. Every document managed. Every communication automated — from contract to close.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/AgentIntake?agent=1")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Start a Transaction <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => base44.auth.redirectToLogin("/Dashboard")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border border-white/30 hover:border-white/60 hover:bg-white/10 transition-colors"
            >
              <Lock className="w-4 h-4" /> TC / Staff Login
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-6 px-8 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/69a9cd0677a8832ab0cc59bc/9c93e25bf_EliteTCLogoBGRemoved.png" alt="EliteTC Logo" className="h-12 max-w-[200px] object-contain" style={{ mixBlendMode: 'lighten' }} />
        </div>
        <p className="text-xs text-gray-500">© 2026 EliteTC. All rights reserved.</p>
      </footer>
    </div>
  );
}