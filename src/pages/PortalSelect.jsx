import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Building2,
  Brain,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
  FileText,
  CheckCircle,
  Bell,
  Upload,
  Sparkles,
  CalendarDays,
  Users,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import ContactModal from "@/components/portal/ContactModal";
import TransactionUpdateModal from "@/components/portal/TransactionUpdateModal";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Contract Parsing",
    description:
      "Upload a Purchase & Sale agreement and automatically extract parties, agent info, deposit amounts, all key deadlines, and closing date — in seconds.",
    color: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    icon: CalendarDays,
    title: "Automated Deadline Tracking",
    description:
      "The system generates a full transaction timeline from your contract data — inspection, financing, appraisal, and closing deadlines all tracked automatically.",
    color: "from-blue-500/20 to-cyan-500/10",
    iconColor: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Monitoring",
    description:
      "Documents are scanned for missing signatures, incomplete fields, and required brokerage documents — keeping your files clean and audit-ready.",
    color: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: LayoutDashboard,
    title: "Role-Based Dashboards",
    description:
      "Agents, transaction coordinators, and clients each get a tailored dashboard — showing exactly what they need, nothing they don't.",
    color: "from-amber-500/20 to-yellow-500/10",
    iconColor: "text-amber-400",
    border: "border-amber-500/20",
  },
];

const STEPS = [
  { icon: Upload, label: "Upload P&S Agreement", step: "01" },
  { icon: Brain, label: "AI Extracts All Data", step: "02" },
  { icon: CalendarDays, label: "Deadlines Populate Automatically", step: "03" },
  { icon: Bell, label: "Agents & TCs Receive Reminders", step: "04" },
];

export default function PortalSelect() {
  const [showContact, setShowContact] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const handleAgentLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("AgentPortal"));
  };

  const handleTCLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#c9a227" }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">EliteTC</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAgentLogin}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Agent Login
          </button>
          <button
            onClick={handleTCLogin}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4aa30"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#c9a227"}
          >
            TC Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Transaction Management
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
           Transaction Coordination
           <br />
           <span style={{ color: "#c9a227" }}>Reimagined with AI</span>
         </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          EliteTC automatically extracts data from Purchase &amp; Sale agreements, generates transaction
          timelines, and keeps agents, coordinators, and clients aligned — from contract to close.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleAgentLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <Users className="w-5 h-5" />
            Agent Login
            <ArrowRight className="w-4 h-4 opacity-60" />
          </button>
          <button
            onClick={handleTCLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold transition-all"
            style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#d4aa30"; e.currentTarget.style.boxShadow = "0 0 32px rgba(201,162,39,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#c9a227"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <ShieldCheck className="w-5 h-5" />
            Transaction Coordinator Login
            <ArrowRight className="w-4 h-4 opacity-70" />
          </button>
        </div>

        {/* Social proof strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
          {["AI Contract Parsing", "Automated Deadlines", "Compliance Tracking", "Role-Based Access"].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
           <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Everything you need, built in</h2>
           <p className="text-slate-400 text-base max-w-xl mx-auto">One platform for the entire transaction lifecycle.</p>
         </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, color, iconColor, border }) => (
            <div
              key={title}
              className={`relative rounded-2xl border ${border} p-6 bg-gradient-to-br ${color} backdrop-blur-sm`}
              style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
           <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>How It Works</h2>
           <p className="text-slate-400 text-base">From upload to close in four simple steps.</p>
         </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(({ icon: Icon, label, step }, i) => (
            <div key={step} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
              )}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative z-10"
                style={{ backgroundColor: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)" }}
              >
                <Icon className="w-7 h-7" style={{ color: "#c9a227" }} />
              </div>
              <span className="text-xs font-bold tracking-widest mb-2" style={{ color: "#c9a227" }}>{step}</span>
              <p className="text-white font-semibold text-sm leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div
          className="rounded-3xl p-10 text-center border border-amber-500/20"
          style={{ background: "linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(15,23,42,0.8) 100%)" }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Ready to streamline your transactions?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">Log in to your portal and start closing deals faster with AI-powered coordination.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleAgentLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> Agent Login
            </button>
            <button
              onClick={handleTCLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4aa30"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#c9a227"}
            >
              <ShieldCheck className="w-4 h-4" /> TC / Admin Login
            </button>
          </div>
        </div>
      </section>

      {/* Support Bar */}
      <section className="border-t border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-500 text-sm mb-4">Need help?</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => setShowContact(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Us
            </button>
            <span className="text-slate-700 text-sm">|</span>
            <button
              onClick={() => setShowUpdate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)", color: "#c9a227" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(201,162,39,0.2)"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(201,162,39,0.12)"}
            >
              <RefreshCw className="w-4 h-4" />
              Request Transaction Update
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#c9a227" }}>
            <Building2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">EliteTC</span>
        </div>
        <p className="text-slate-600 text-xs">© 2025 EliteTC. All rights reserved.</p>
      </footer>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showUpdate && <TransactionUpdateModal onClose={() => setShowUpdate(false)} />}
    </div>
  );
}