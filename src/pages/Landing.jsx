import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FileText, Clock, ShieldCheck, Send, ArrowRight,
  CheckCircle2, Upload, Zap, Bell, Users, Lock, Building2,
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
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Elite<span style={{ color: "var(--accent)" }}>TC</span>
          </span>
        </div>

        {/* Tabs */}
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

        <div className="w-24" /> {/* spacer to center tabs */}
      </header>

      {/* ── Content Area ── */}
      <main className="flex-1 min-h-0 overflow-hidden px-6 py-5">
        {activeTab === "overview"     && <OverviewTab navigate={navigate} />}
        {activeTab === "how_it_works" && <HowItWorksTab />}
        {activeTab === "features"     && <FeaturesTab />}
        {activeTab === "pricing"      && <PricingTab navigate={navigate} />}
      </main>

      {/* ── Fixed Bottom Action Bar ── */}
      <footer
        className="flex-shrink-0 flex items-center justify-center gap-3 px-6 h-14 border-t"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => base44.auth.redirectToLogin("/Dashboard")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          <Lock className="w-3.5 h-3.5" /> TC Login
        </button>
        <button
          onClick={() => navigate(createPageUrl("AddTransaction"))}
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
function OverviewTab() {
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
      {/* Left — Headline */}
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            Transaction Coordination Platform
          </p>
          <h1 className="text-3xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Manage Every Deal<br />With Precision
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            EliteTC automates document parsing, deadline tracking, and compliance monitoring — so you close faster with fewer errors.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Upload,      label: "AI Contract Parsing" },
            { icon: Clock,       label: "Deadline Tracking" },
            { icon: ShieldCheck, label: "Compliance Scan" },
            { icon: Send,        label: "Smart Comms" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>No setup required — upload a P&S and Atlas extracts everything automatically.</span>
        </div>
      </div>

      {/* Right — Dashboard Preview */}
      <div
        className="rounded-2xl border p-4 space-y-3 h-full max-h-96 overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        {/* Fake header */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>742 Elm Street, Portland, OR</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Buyer Transaction · Under Contract</p>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">Active</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500">Score 94%</span>
          </div>
        </div>

        {/* Key dates strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Contract",  date: "Mar 28", ok: true },
            { label: "Inspection", date: "Apr 10", ok: false },
            { label: "Closing",   date: "Apr 30", ok: true },
          ].map(({ label, date, ok }) => (
            <div
              key={label}
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: "var(--bg-tertiary)", border: `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.3)"}` }}
            >
              <p className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: ok ? "var(--success)" : "var(--warning)" }}>{date}</p>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>Tasks</p>
          {[
            { label: "Earnest money deposit received",   done: true },
            { label: "Schedule home inspection",         done: true },
            { label: "Order appraisal",                  done: false },
            { label: "Submit financing docs to lender",  done: false },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: done ? "var(--success)" : "var(--border)", backgroundColor: done ? "var(--success)" : "transparent" }}
              >
                {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div
          className="flex items-start gap-2.5 p-2.5 rounded-xl border"
          style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.25)" }}
        >
          <Bell className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold text-amber-500">Appraisal not ordered.</span> Financing deadline in 8 days.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
function HowItWorksTab() {
  const steps = [
    { num: "01", icon: Upload,        title: "Upload Contract",       desc: "Drop in a Purchase & Sales agreement or listing doc. Atlas reads it instantly." },
    { num: "02", icon: Zap,           title: "AI Extracts Everything", desc: "Deadlines, parties, contingencies, and key terms are parsed and structured automatically." },
    { num: "03", icon: Bell,          title: "Tasks & Alerts Created", desc: "A full task checklist and deadline calendar is generated — no manual entry needed." },
    { num: "04", icon: Send,          title: "Communicate & Close",    desc: "Send under-contract emails, track compliance, and guide the deal to a clean close." },
  ];

  return (
    <div className="h-full flex items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {steps.map(({ num, icon: Icon, title, desc }, i) => (
          <div
            key={num}
            className="rounded-2xl border p-5 space-y-3 relative"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "var(--accent-subtle)" }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-2xl font-bold" style={{ color: "var(--bg-tertiary)" }}>{num}</span>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div
                className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-px"
                style={{ backgroundColor: "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FEATURES ──────────────────────────────────────────────────────────────────
function FeaturesTab() {
  const features = [
    { icon: Upload,         label: "AI Document Parsing",    desc: "Extracts deadlines, parties, and terms from any P&S or listing agreement." },
    { icon: Clock,          label: "Deadline Tracking",      desc: "Never miss a date. Visual countdown with task-aware resolution logic." },
    { icon: ShieldCheck,    label: "Compliance Engine",      desc: "Real-time scan for missing signatures, fields, and regulatory blockers." },
    { icon: Send,           label: "Atlas Communications",   desc: "Auto-generate buyer, seller, lender & title emails from parsed contract data." },
    { icon: LayoutDashboard,label: "Pipeline Dashboard",     desc: "Health scores, risk levels, and overdue alerts across all active deals." },
    { icon: Users,          label: "Role-Based Access",      desc: "TC, agent, and client views. Each party sees exactly what they need." },
  ];

  return (
    <div className="h-full flex items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {features.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="rounded-2xl border p-4 space-y-2"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--accent-subtle)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </div>
        ))}
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
      features: ["Up to 5 active transactions", "AI contract parsing", "Email alerts & reminders"],
      action: () => navigate(createPageUrl("AddTransaction")),
      cta: "Get Started",
    },
    {
      name: "Professional",
      price: "$299",
      period: "/mo",
      highlighted: true,
      features: ["Unlimited transactions", "Advanced compliance scan", "Team collaboration", "Custom templates"],
      action: () => navigate(createPageUrl("AddTransaction")),
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: ["Everything in Pro", "Dotloop & SkySlope sync", "Dedicated support", "SLA guarantee"],
      action: () => { window.location.href = "mailto:sales@elitetc.com"; },
      cta: "Contact Sales",
    },
  ];

  return (
    <div className="h-full flex items-center">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {plans.map(({ name, price, period, features, action, cta, highlighted }) => (
          <div
            key={name}
            className="rounded-2xl border p-5 space-y-4 flex flex-col"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: highlighted ? "var(--accent)" : "var(--card-border)",
              boxShadow: highlighted ? "0 0 0 1px var(--accent)" : "var(--card-shadow)",
            }}
          >
            <div>
              {highlighted && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Most Popular
                </span>
              )}
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{name}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>
                {price}<span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>{period}</span>
              </p>
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