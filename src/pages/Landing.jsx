import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Zap, CheckCircle2, Mail, Shield, BarChart3, Lock, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "pricing", label: "Pricing" },
  { id: "login", label: "Login" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)" }}>
      {/* Top Navigation */}
      <nav className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(15,20,40,0.8)", backdropFilter: "blur(10px)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <span className="text-white font-semibold hidden sm:inline">EliteTC</span>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-8">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm font-medium transition-colors py-2 px-1 border-b-2 ${
                  activeTab === tab.id
                    ? "text-blue-400 border-blue-400"
                    : "text-gray-400 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Tabs */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content Container */}
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

function OverviewTab({ navigate }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 px-6 py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Headline + Feature Strip */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Real Estate Transactions <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">Simplified</span>
            </h1>
            <p className="text-base md:text-lg text-gray-300 mb-6">
              Automate document parsing, deadline tracking, and compliance monitoring. Focus on closing deals, not admin work.
            </p>

            {/* Feature Strip - 4 compact items */}
            <div className="flex flex-wrap gap-4 mb-6">
              <FeatureItem icon={Upload} label="Extracts Contract Data" />
              <FeatureItem icon={Zap} label="Builds Timeline Automatically" />
              <FeatureItem icon={Shield} label="Tracks Compliance" />
              <FeatureItem icon={Mail} label="Sends Smart Reminders" />
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Button onClick={() => navigate(createPageUrl("AddTransaction"))} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg gap-2">
                Start Transaction <ArrowRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => navigate(createPageUrl("TCSignIn"))} variant="outline" className="border-gray-600 text-gray-300 hover:bg-white/5 px-6 py-2 rounded-lg">
                TC Login
              </Button>
            </div>
          </div>

          {/* Transaction Snapshot + Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Transaction Snapshot Card */}
            <div className="md:col-span-2 rounded-xl p-5 border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(30,35,60,0.5)" }}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Property Address</p>
                  <p className="text-sm md:text-base font-semibold text-white">742 Elm Street, Portland, OR 97214</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <p className="text-sm font-semibold text-yellow-400">Under Contract</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Days to Close</p>
                    <p className="text-sm font-bold text-white">18 days</p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Key Milestones</p>
                  <div className="space-y-2">
                    <MilestoneRow status="completed" label="Earnest Money Deposit" date="Mar 28" />
                    <MilestoneRow status="upcoming" label="Inspection Deadline" date="Apr 10" />
                    <MilestoneRow status="attention" label="Appraisal Not Ordered" date="Apr 12" />
                    <MilestoneRow status="attention" label="Financing Commitment" date="Apr 18" />
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts & Stats */}
            <div className="space-y-4 min-h-0 flex flex-col">
              {/* Alerts */}
              <div className="rounded-xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(30,35,60,0.5)" }}>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Alerts</p>
                <div className="space-y-2">
                  <AlertItem icon="⚠️" message="Appraisal not ordered" color="red" />
                  <AlertItem icon="⚠️" message="Financing commitment pending" color="yellow" />
                </div>
              </div>

              {/* Health Score */}
              <div className="rounded-xl p-4 border flex-1 flex flex-col justify-center" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(30,35,60,0.5)" }}>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Health Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">94%</span>
                  <span className="text-xs text-emerald-400 font-semibold">Excellent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div className="flex-shrink-0 px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(15,20,40,0.8)" }}>
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

function FeatureItem({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <span className="text-xs md:text-sm font-medium text-gray-300">{label}</span>
    </div>
  );
}

function MilestoneRow({ status, label, date }) {
  const statusConfig = {
    completed: { color: "text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
    upcoming: { color: "text-yellow-400", dot: "bg-yellow-500", bg: "bg-yellow-500/10" },
    attention: { color: "text-red-400", dot: "bg-red-500", bg: "bg-red-500/10" },
  };
  const config = statusConfig[status];

  return (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${config.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
        <span className={`${config.color} font-medium truncate`}>{label}</span>
      </div>
      <span className="text-gray-400 text-xs whitespace-nowrap ml-2">{date}</span>
    </div>
  );
}

function AlertItem({ icon, message, color }) {
  const colorMap = {
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  };

  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded border text-xs ${colorMap[color]}`}>
      <span className="text-sm flex-shrink-0">{icon}</span>
      <span className="font-medium leading-tight">{message}</span>
    </div>
  );
}

function MetricPill({ number, label }) {
  return (
    <div className="text-center">
      <p className="text-lg md:text-xl font-bold text-white">{number}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function FeaturesTab() {
  const features = [
    {
      icon: Upload,
      title: "Document Parsing",
      description: "Upload Purchase & Sales agreements. AI extracts dates, parties, and deadlines automatically.",
    },
    {
      icon: Shield,
      title: "Compliance Monitoring",
      description: "Real-time scan for missing signatures, incomplete fields, and regulatory blockers.",
    },
    {
      icon: Zap,
      title: "Deadline Tracking",
      description: "Never miss a deadline. Automated alerts and calendar integration for all key dates.",
    },
    {
      icon: Mail,
      title: "Automated Emails",
      description: "Generate and send status updates. Customizable templates for every transaction stage.",
    },
  ];

  return (
    <div className="h-full px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Powerful Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="rounded-xl p-6 border transition-all hover:border-blue-400/50 hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(30,35,60,0.4)" }}
              >
                <Icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HowItWorksTab() {
  const steps = [
    {
      number: "1",
      title: "Upload Documents",
      description: "Drop your Purchase & Sales agreement or listing documents",
      icon: Upload,
    },
    {
      number: "2",
      title: "Extract Data",
      description: "AI reads contracts and pulls deadlines, parties, and key terms",
      icon: Zap,
    },
    {
      number: "3",
      title: "Generate Tasks",
      description: "Auto-create tasks and set up deadline reminders",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="h-full px-6 py-8 flex items-center overflow-hidden">
      <div className="max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute left-20 top-8 w-12 h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center">{step.title}</h3>
                <p className="text-sm text-gray-400 text-center">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
      features: ["Everything in Pro", "Integrations (Dotloop, Skyslope)", "Dedicated support", "SLA guarantee"],
      cta: "Contact Sales",
      action: () => window.location.href = "mailto:sales@elitetc.com",
    },
  ];

  return (
    <div className="h-full px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-3 text-center">Transparent Pricing</h2>
        <p className="text-gray-400 text-center mb-12">Choose the plan that fits your workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-xl p-6 border transition-all ${
                plan.highlighted
                  ? "border-blue-500/50 bg-gradient-to-br from-blue-600/10 to-purple-600/10 ring-1 ring-blue-500/20 md:scale-105"
                  : "border-gray-700 bg-gray-900/30 hover:border-gray-600"
              }`}
            >
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={plan.action} className={`w-full ${plan.highlighted ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"} text-white rounded-lg`}>
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginTab({ navigate }) {
  const [agentCode, setAgentCode] = React.useState("");
  
  const handleAgentAccess = () => {
    if (agentCode.trim()) {
      navigate(`/ClientLookup?code=${encodeURIComponent(agentCode)}`);
    }
  };

  const handleTCLogin = () => {
    navigate(createPageUrl("TCSignIn"));
  };

  return (
    <div className="h-full px-6 py-8 flex items-center overflow-hidden">
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Agent Access */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Agent Portal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Code</label>
              <input
                type="text"
                placeholder="Enter your code"
                value={agentCode}
                onChange={(e) => setAgentCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgentAccess()}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={handleAgentAccess} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              Access Portal
            </Button>
          </div>
        </div>

        {/* TC Login */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">TC Dashboard</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={handleTCLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}