import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Zap, CheckCircle2, Mail, Shield, BarChart3, Lock, Menu, X, FileText, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

// Brand colors
const NAVY = "#0D1B2A";
const NAVY_MID = "#112236";
const NAVY_LIGHT = "#1A2F45";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C06E";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const GOLD_BORDER = "rgba(201,168,76,0.3)";
const WHITE_DIM = "rgba(255,255,255,0.07)";
const WHITE_BORDER = "rgba(255,255,255,0.12)";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "pricing", label: "Pricing" },
  { id: "login", label: "Login" },
];

// ── Logo Component ────────────────────────────────────────────────────────────
function EliteTCLogo({ size = "md" }) {
  const iconSize = size === "lg" ? 48 : size === "sm" ? 24 : 32;
  const textSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      {/* Document + pen icon */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center rounded-lg"
        style={{
          width: iconSize,
          height: iconSize,
          background: "transparent",
          border: `2px solid ${GOLD}`,
        }}
      >
        <FileText style={{ color: GOLD, width: iconSize * 0.55, height: iconSize * 0.55 }} />
        <div
          className="absolute"
          style={{ bottom: -4, right: -4, background: NAVY, borderRadius: "50%", padding: 2 }}
        >
          <Pen style={{ color: GOLD, width: iconSize * 0.32, height: iconSize * 0.32 }} />
        </div>
      </div>
      {/* Wordmark */}
      <span className={`font-serif font-bold tracking-tight ${textSize}`}>
        <span style={{ color: "#FFFFFF" }}>Elite</span>
        <span style={{ color: GOLD }}>TC</span>
      </span>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0A1628 60%, #0D1F35 100%)` }}
    >
      {/* Top Navigation */}
      <nav
        className="flex-shrink-0 px-6 py-3 border-b"
        style={{ borderColor: GOLD_BORDER, background: `rgba(13,27,42,0.92)`, backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <EliteTCLogo size="sm" />

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="text-sm font-medium transition-all px-4 py-1.5 rounded-lg"
                style={
                  activeTab === tab.id
                    ? { color: NAVY, background: GOLD, fontWeight: 600 }
                    : { color: "rgba(255,255,255,0.6)" }
                }
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className="md:hidden"
            style={{ color: "rgba(255,255,255,0.6)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={
                  activeTab === tab.id
                    ? { color: GOLD, background: GOLD_DIM }
                    : { color: "rgba(255,255,255,0.55)" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "overview" && <OverviewTab navigate={navigate} />}
        {activeTab === "features" && <FeaturesTab />}
        {activeTab === "how-it-works" && <HowItWorksTab />}
        {activeTab === "pricing" && <PricingTab navigate={navigate} />}
        {activeTab === "login" && <LoginTab navigate={navigate} />}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ navigate }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 px-6 py-5 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">

          {/* Hero */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full tracking-wider uppercase"
                style={{ background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
              >
                Real Estate Transaction Management
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-serif leading-tight">
              Transactions Managed
              <span style={{ color: GOLD }}> With Precision</span>
            </h1>
            <p className="text-base text-gray-300 mb-5 max-w-2xl">
              Automate document parsing, deadline tracking, and compliance monitoring. Close deals faster with EliteTC.
            </p>

            {/* Feature Strip */}
            <div className="flex flex-wrap gap-3 mb-5">
              <FeaturePill icon={Upload} label="AI Contract Parsing" />
              <FeaturePill icon={Zap} label="Auto Timeline" />
              <FeaturePill icon={Shield} label="Compliance Tracking" />
              <FeaturePill icon={Mail} label="Smart Reminders" />
            </div>

            {/* CTAs */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(createPageUrl("AddTransaction"))}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: GOLD, color: NAVY }}
              >
                Start a Transaction <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => base44.auth.redirectToLogin("/Dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ border: `1px solid ${GOLD_BORDER}`, color: GOLD, background: GOLD_DIM }}
              >
                TC Login
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Snapshot */}
            <div
              className="md:col-span-2 rounded-xl p-5 border overflow-hidden"
              style={{ borderColor: GOLD_BORDER, background: "rgba(17,34,54,0.7)" }}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>Property</p>
                  <p className="text-sm font-semibold text-white">742 Elm Street, Portland, OR 97214</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>Status</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <p className="text-sm font-semibold text-yellow-300">Under Contract</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>Days to Close</p>
                    <p className="text-sm font-bold text-white">18 days</p>
                  </div>
                </div>
                <div className="border-t pt-4" style={{ borderColor: WHITE_BORDER }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: GOLD }}>Key Milestones</p>
                  <div className="space-y-2">
                    <MilestoneRow status="completed" label="Earnest Money Deposit" date="Mar 28" />
                    <MilestoneRow status="upcoming" label="Inspection Deadline" date="Apr 10" />
                    <MilestoneRow status="attention" label="Appraisal Not Ordered" date="Apr 12" />
                    <MilestoneRow status="attention" label="Financing Commitment" date="Apr 18" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4 min-h-0 flex flex-col">
              <div className="rounded-xl p-4 border" style={{ borderColor: WHITE_BORDER, background: "rgba(17,34,54,0.7)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: GOLD }}>Alerts</p>
                <div className="space-y-2">
                  <AlertItem message="Appraisal not ordered" color="red" />
                  <AlertItem message="Financing commitment pending" color="yellow" />
                </div>
              </div>
              <div
                className="rounded-xl p-4 border flex-1 flex flex-col justify-center"
                style={{ borderColor: GOLD_BORDER, background: GOLD_DIM }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD }}>Health Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">94%</span>
                  <span className="text-xs font-semibold text-emerald-400">Excellent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div
        className="flex-shrink-0 px-6 py-3 border-t"
        style={{ borderColor: GOLD_BORDER, background: "rgba(13,27,42,0.9)" }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricPill number="12" label="Key Dates Extracted" />
          <MetricPill number="8" label="Tasks Generated" />
          <MetricPill number="0" label="Missed Deadlines" />
          <MetricPill number="100%" label="File Compliance" />
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: WHITE_DIM, border: `1px solid ${WHITE_BORDER}` }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
      <span className="text-xs font-medium text-gray-300">{label}</span>
    </div>
  );
}

function MilestoneRow({ status, label, date }) {
  const cfg = {
    completed: { color: "text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
    upcoming:  { color: "text-yellow-300",  dot: "bg-yellow-400",  bg: "bg-yellow-500/10" },
    attention: { color: "text-red-400",     dot: "bg-red-500",     bg: "bg-red-500/10" },
  }[status];
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${cfg.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
        <span className={`${cfg.color} font-medium truncate`}>{label}</span>
      </div>
      <span className="text-gray-500 whitespace-nowrap ml-2">{date}</span>
    </div>
  );
}

function AlertItem({ message, color }) {
  const cls = color === "red"
    ? "bg-red-500/10 border-red-500/20 text-red-400"
    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded border text-xs ${cls}`}>
      <span>⚠️</span>
      <span className="font-medium leading-tight">{message}</span>
    </div>
  );
}

function MetricPill({ number, label }) {
  return (
    <div className="text-center">
      <p className="text-lg md:text-xl font-bold" style={{ color: GOLD }}>{number}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function FeaturesTab() {
  const features = [
    { icon: Upload,       title: "Document Parsing",       description: "Upload Purchase & Sales agreements. AI extracts dates, parties, and deadlines automatically." },
    { icon: Shield,       title: "Compliance Monitoring",  description: "Real-time scan for missing signatures, incomplete fields, and regulatory blockers." },
    { icon: Zap,          title: "Deadline Tracking",      description: "Never miss a deadline. Automated alerts and calendar integration for all key dates." },
    { icon: Mail,         title: "Automated Emails",       description: "Generate and send status updates. Customizable templates for every transaction stage." },
    { icon: BarChart3,    title: "Analytics Dashboard",    description: "Track pipeline health, closed deals, and team performance at a glance." },
    { icon: Lock,         title: "Role-Based Access",      description: "Granular permissions for TCs, agents, and clients. Everyone sees only what they need." },
  ];

  return (
    <div className="h-full px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold font-serif text-white mb-2 text-center">
          Powerful <span style={{ color: GOLD }}>Features</span>
        </h2>
        <p className="text-center text-gray-400 mb-10">Everything you need to run a best-in-class TC operation</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="rounded-xl p-5 border transition-all hover:scale-[1.02]"
                style={{ borderColor: WHITE_BORDER, background: "rgba(17,34,54,0.6)", cursor: "default" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = GOLD_BORDER}
                onMouseLeave={e => e.currentTarget.style.borderColor = WHITE_BORDER}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: GOLD_DIM }}>
                  <Icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksTab() {
  const steps = [
    { number: "01", title: "Upload Documents", description: "Drop your Purchase & Sales agreement or listing documents", icon: Upload },
    { number: "02", title: "AI Extracts Data",  description: "AI reads contracts and pulls deadlines, parties, and key terms", icon: Zap },
    { number: "03", title: "Tasks & Alerts",    description: "Auto-create tasks, set deadline reminders, and notify parties", icon: CheckCircle2 },
  ];

  return (
    <div className="h-full px-6 py-8 flex items-center overflow-hidden">
      <div className="max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold font-serif text-white mb-2 text-center">
          How It <span style={{ color: GOLD }}>Works</span>
        </h2>
        <p className="text-center text-gray-400 mb-12">From contract upload to close in three steps</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center flex-1 text-center px-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative"
                    style={{ background: GOLD_DIM, border: `2px solid ${GOLD}` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: GOLD }} />
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: GOLD, color: NAVY }}
                    >
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400 max-w-[200px]">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block h-0.5 w-16 flex-shrink-0"
                    style={{ background: `linear-gradient(to right, ${GOLD_BORDER}, transparent)` }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingTab({ navigate }) {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/month",
      description: "Perfect for new TCs",
      features: ["Up to 5 active transactions", "Document parsing", "Email alerts"],
      cta: "Start Free Trial",
      action: () => navigate(createPageUrl("AddTransaction")),
    },
    {
      name: "Professional",
      price: "$299",
      period: "/month",
      description: "For growing teams",
      features: ["Unlimited transactions", "Advanced compliance", "Team collaboration", "Custom templates"],
      cta: "Get Started",
      highlighted: true,
      action: () => navigate(createPageUrl("AddTransaction")),
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large operations",
      features: ["Everything in Pro", "Dotloop & SkySlope integrations", "Dedicated support", "SLA guarantee"],
      cta: "Contact Sales",
      action: () => window.location.href = "mailto:sales@elitetc.com",
    },
  ];

  return (
    <div className="h-full px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold font-serif text-white mb-2 text-center">
          Transparent <span style={{ color: GOLD }}>Pricing</span>
        </h2>
        <p className="text-gray-400 text-center mb-10">Choose the plan that fits your workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className="rounded-xl p-6 border transition-all"
              style={
                plan.highlighted
                  ? { borderColor: GOLD, background: GOLD_DIM, transform: "scale(1.03)" }
                  : { borderColor: WHITE_BORDER, background: "rgba(17,34,54,0.6)" }
              }
            >
              {plan.highlighted && (
                <div
                  className="text-xs font-bold px-3 py-1 rounded-full inline-block mb-3"
                  style={{ background: GOLD, color: NAVY }}
                >
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-3">
                <span className="text-3xl font-bold" style={{ color: GOLD }}>{plan.price}</span>
                {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-400 mb-5">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.action}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={
                  plan.highlighted
                    ? { background: GOLD, color: NAVY }
                    : { background: WHITE_DIM, color: "rgba(255,255,255,0.8)", border: `1px solid ${WHITE_BORDER}` }
                }
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginTab({ navigate }) {
  const [agentCode, setAgentCode] = React.useState("");

  const handleAgentAccess = () => {
    if (agentCode.trim()) navigate(`/ClientLookup?code=${encodeURIComponent(agentCode)}`);
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${WHITE_BORDER}`,
    background: WHITE_DIM,
    color: "#fff",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div className="h-full px-6 py-8 flex items-center overflow-hidden">
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Agent Portal */}
        <div
          className="rounded-xl p-6 border"
          style={{ borderColor: WHITE_BORDER, background: "rgba(17,34,54,0.6)" }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: GOLD_DIM }}>
            <FileText className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <h2 className="text-xl font-bold font-serif text-white mb-1">Agent Portal</h2>
          <p className="text-sm text-gray-400 mb-5">Enter your transaction code to view status and deadlines</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD }}>
                Transaction Code
              </label>
              <input
                type="text"
                placeholder="Enter your code"
                value={agentCode}
                onChange={e => setAgentCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAgentAccess()}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleAgentAccess}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: GOLD, color: NAVY }}
            >
              Access Portal
            </button>
          </div>
        </div>

        {/* TC Dashboard */}
        <div
          className="rounded-xl p-6 border"
          style={{ borderColor: GOLD_BORDER, background: GOLD_DIM }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(201,168,76,0.25)" }}>
            <Lock className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <h2 className="text-xl font-bold font-serif text-white mb-1">TC Dashboard</h2>
          <p className="text-sm text-gray-400 mb-5">Sign in to manage your transactions and pipeline</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD }}>Email</label>
              <input type="email" placeholder="your@email.com" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD }}>Password</label>
              <input type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <button
              onClick={() => base44.auth.redirectToLogin("/Dashboard")}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: GOLD, color: NAVY }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}