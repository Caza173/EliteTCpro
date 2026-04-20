import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FileText, Clock, ShieldCheck, Send, ArrowRight,
  CheckCircle2, Upload, Zap, Bell, Users, Lock, Building2,
  AlertTriangle, X, ArrowUpRight, TrendingUp, ClipboardCheck,
} from "lucide-react";

const TABS = [
  { id: "overview",     label: "Overview" },
  { id: "how_it_works", label: "How It Works" },
  { id: "features",     label: "Features" },
  { id: "pricing",      label: "Pricing" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* ── Top Nav ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 h-12 border-b"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Elite<span style={{ color: "var(--accent)" }}>TC</span>
          </span>
        </div>

        <nav className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-tertiary)" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activeTab === tab.id
                  ? { backgroundColor: "var(--card-bg)", color: "var(--text-primary)", boxShadow: "var(--card-shadow)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => base44.auth.redirectToLogin("/Dashboard")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" }}
        >
          <Lock className="w-3.5 h-3.5" /> Sign In
        </button>
      </header>

      {/* ── Content Area ── */}
      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {activeTab === "overview"     && <OverviewTab navigate={navigate} />}
        {activeTab === "how_it_works" && <HowItWorksTab />}
        {activeTab === "features"     && <FeaturesTab />}
        {activeTab === "pricing"      && <PricingTab navigate={navigate} />}
      </main>

      {/* ── Fixed Bottom Action Bar ── */}
      <footer
        className="flex-shrink-0 flex items-center justify-center gap-3 px-6 h-12 border-t"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => base44.auth.redirectToLogin("/Dashboard")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          <Lock className="w-3.5 h-3.5" /> TC / Staff Login
        </button>
        <button
          onClick={() => navigate("/AgentIntake?agent=1")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--card-bg)" }}
        >
          <FileText className="w-3.5 h-3.5" /> Start a Transaction
        </button>
        <button
          onClick={() => navigate("/ClientLookup")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--card-bg)" }}
        >
          <ArrowRight className="w-3.5 h-3.5" /> Check Transaction Status
        </button>
      </footer>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({ navigate }) {
  return (
    <div className="space-y-5 pb-4">
      {/* Hero + Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left — Hero */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
              Full-Stack Transaction Management
            </p>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              Every Deadline. Every Document.<br />Automatically Managed.
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              EliteTC replaces spreadsheets, manual tracking, and fragmented systems by automating document parsing, deadline management, and compliance — from contract to close.
            </p>
          </div>

          <div className="space-y-1.5">
            {[
              "Extracts data directly from Purchase & Sales agreements",
              "Tracks every deadline and contingency automatically",
              "Flags compliance risks before they become problems",
            ].map(b => (
              <div key={b} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {b}
              </div>
            ))}
          </div>

          {/* Feature pill grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Upload,       label: "Contract Data Extraction",         desc: "Auto-parses P&S docs" },
              { icon: Clock,        label: "Deadline & Contingency Tracking",  desc: "Real-time countdowns" },
              { icon: ShieldCheck,  label: "Compliance & Risk Detection",       desc: "Flags issues early" },
              { icon: Send,         label: "Automated Transaction Emails",      desc: "All parties covered" },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                <div>
                  <p className="text-[11px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Live Deal Preview */}
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>742 Elm Street, Portland, OR</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Buyer Transaction · Under Contract</p>
            </div>
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">Active</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500">At Risk</span>
            </div>
          </div>

          {/* Countdown deadlines */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Inspection", date: "Apr 10", days: "3 days", urgent: true },
              { label: "Appraisal",  date: "Apr 18", days: "11 days", urgent: false },
              { label: "Closing",    date: "Apr 30", days: "23 days", urgent: false },
            ].map(({ label, date, days, urgent }) => (
              <div
                key={label}
                className="rounded-lg p-2 text-center"
                style={{ backgroundColor: "var(--bg-tertiary)", border: `1px solid ${urgent ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.2)"}` }}
              >
                <p className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-[11px] font-bold mt-0.5" style={{ color: urgent ? "var(--danger)" : "var(--success)" }}>{date}</p>
                <p className="text-[9px]" style={{ color: urgent ? "var(--danger)" : "var(--text-muted)" }}>{days}</p>
              </div>
            ))}
          </div>

          {/* Alert badges */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                <span className="text-red-500 font-semibold">Missing document:</span> Signed inspection report not uploaded
              </p>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
              <Bell className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                <span className="text-amber-500 font-semibold">Addendum likely needed</span> — inspection deadline in 3 days
              </p>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>Tasks</p>
            {[
              { label: "Earnest money deposit confirmed",  done: true },
              { label: "Inspection scheduled",             done: true },
              { label: "Order appraisal",                  done: false },
              { label: "Submit financing docs to lender",  done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: done ? "var(--success)" : "var(--border)", backgroundColor: done ? "var(--success)" : "transparent" }}
                >
                  {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-[11px]" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Replace Your Stack */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>Replace Your Current Stack</p>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Stop managing transactions across multiple systems.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Current Process</p>
            <div className="space-y-1.5">
              {["Dotloop / Skyslope", "Spreadsheets", "Manual deadline tracking", "Email follow-ups", "Compliance guesswork"].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--accent)" }}>EliteTC</p>
            <div className="space-y-1.5">
              {["Unified transaction system", "Automated workflows", "Real-time deadline tracking", "Auto-generated communications", "Built-in compliance engine"].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>A Standard Transaction Includes</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "40–80", label: "Tasks" },
              { val: "10–20", label: "Deadlines" },
              { val: "15+",   label: "Documents" },
              { val: "5+",    label: "Parties" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{val}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>EliteTC Automatically</p>
          <div className="space-y-1.5">
            {[
              "Builds the full timeline from the contract",
              "Assigns and tracks tasks by phase",
              "Monitors all deadlines with alerts",
              "Coordinates communication between all parties",
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <ArrowUpRight className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
function HowItWorksTab() {
  const steps = [
    { num: "01", icon: Upload,          title: "Upload Agreement",            desc: "Upload a Purchase & Sales or listing agreement in any format." },
    { num: "02", icon: Zap,             title: "Extract Key Data",            desc: "System identifies parties, deadlines, deposits, contingencies, and key terms." },
    { num: "03", icon: ClipboardCheck,  title: "Generate Timeline & Tasks",   desc: "Automatically builds a full transaction timeline with all required actions." },
    { num: "04", icon: Bell,            title: "Monitor & Alert",             desc: "Tracks deadlines, sends reminders, and flags risks in real time." },
    { num: "05", icon: Send,            title: "Automate Communication",      desc: "Generates emails to buyers, sellers, lenders, and title companies." },
    { num: "06", icon: ShieldCheck,     title: "Close with Confidence",       desc: "Ensure all documents, deadlines, and compliance requirements are complete." },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>From Upload to Close — Automated</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Every step in the transaction lifecycle is handled, tracked, and audited in one system.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map(({ num, icon: Icon, title, desc }, i) => (
          <div
            key={num}
            className="rounded-2xl border p-4 space-y-3 relative"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--accent-subtle)" }}>
                <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-xl font-bold" style={{ color: "var(--bg-hover)" }}>{num}</span>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FEATURES ──────────────────────────────────────────────────────────────────
function FeaturesTab() {
  return (
    <div className="space-y-5 pb-4">
      {/* Section 1 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Transaction Automation</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Upload,          label: "Contract Data Extraction",        desc: "Extracts buyer, seller, deadlines, deposits, and contingencies directly from uploaded agreements." },
            { icon: TrendingUp,      label: "Timeline Generation",             desc: "Builds the full transaction timeline from contract date to closing automatically." },
            { icon: ClipboardCheck,  label: "Task Automation",                 desc: "Assigns phase-based tasks to agents, TCs, and clients. No manual entry required." },
            { icon: Clock,           label: "Deadline & Contingency Tracking", desc: "Visual countdown with real-time alerts. Every deadline monitored continuously." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border p-3.5 space-y-2" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--accent-subtle)" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                </div>
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{label}</p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Compliance Engine</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Compliance Isn't Optional. We Enforce It.</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Every deal is automatically scanned for regulatory and workflow compliance. Blockers are surfaced before they delay or kill the transaction.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Detect missing signatures and initials",
                "Flag expired or approaching contingencies",
                "Trigger required disclosures (e.g. lead paint)",
                "Identify incomplete documentation",
              ].map(f => (
                <div key={f} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  <ShieldCheck className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Communication & Visibility</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Send,           label: "Automated Transaction Emails",   desc: "Generates buyer, seller, lender, and title emails from contract data automatically." },
            { icon: LayoutDashboard,label: "Shared Timeline Access",         desc: "All parties view the deal timeline through a secure, code-gated portal." },
            { icon: Users,          label: "Role-Based Views",               desc: "Agent, TC, and client dashboards — each sees exactly what they need." },
            { icon: ArrowRight,     label: "Transaction Status Portal",      desc: "Clients track their deal status with a simple access code. No login required." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border p-3.5 space-y-2" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
                  <Icon className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{label}</p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who It's For */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "var(--warning)" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Who It's For</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            {
              icon: Users, label: "Agents",
              points: ["Stop tracking deadlines manually", "Stay informed without micromanaging your TC", "Client portal keeps buyers & sellers updated"],
            },
            {
              icon: ClipboardCheck, label: "Transaction Coordinators",
              points: ["Manage more deals simultaneously", "Standardize workflows across every transaction", "AI-generated emails save hours per deal"],
            },
            {
              icon: Building2, label: "Brokerages & Teams",
              points: ["Reduce compliance risk across all deals", "Centralize every transaction in one system", "Full audit trail for every action taken"],
            },
          ].map(({ icon: Icon, label, points }) => (
            <div key={label} className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
                  <Icon className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{label}</p>
              </div>
              <div className="space-y-1.5">
                {points.map(p => (
                  <div key={p} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PRICING ───────────────────────────────────────────────────────────────────
function PricingTab({ navigate }) {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/mo",
      subtitle: "For individual agents managing a limited number of deals",
      features: ["Up to 5 active transactions", "Contract data extraction", "Email alerts & deadline tracking", "Client status portal"],
      action: () => navigate(createPageUrl("AddTransaction")),
      cta: "Get Started",
    },
    {
      name: "Professional",
      price: "$299",
      period: "/mo",
      subtitle: "For active agents and TCs managing multiple transactions",
      highlighted: true,
      features: ["Unlimited transactions", "Full compliance scan engine", "Team collaboration & role-based access", "Automated communications (Atlas)", "Custom workflow templates"],
      action: () => navigate(createPageUrl("AddTransaction")),
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      subtitle: "For teams and brokerages requiring scale and integrations",
      features: ["Everything in Professional", "Dotloop & SkySlope sync", "Custom integrations & API access", "Dedicated support & SLA guarantee", "Brokerage-wide audit trail"],
      action: () => { window.location.href = "mailto:sales@elitetc.com"; },
      cta: "Contact Sales",
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Simple, Transparent Pricing</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Replace multiple disconnected tools with one system. No per-seat fees on Starter or Pro.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(({ name, price, period, subtitle, features, action, cta, highlighted }) => (
          <div
            key={name}
            className="rounded-2xl border p-5 space-y-4 flex flex-col"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: highlighted ? "var(--accent)" : "var(--card-border)",
              boxShadow: highlighted ? "0 0 0 1px var(--accent), var(--card-shadow)" : "var(--card-shadow)",
            }}
          >
            <div>
              {highlighted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                  Most Popular
                </span>
              )}
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{name}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--accent)" }}>
                {price}<span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>{period}</span>
              </p>
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
            </div>
            <ul className="space-y-1.5 flex-1">
              {features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={action}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                highlighted
                  ? { backgroundColor: "var(--accent)", color: "#fff" }
                  : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }
              }
            >
              {cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}