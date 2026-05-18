import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, Upload, Clock, ShieldCheck,
  Users, LayoutDashboard, CheckCircle2, Zap,
  FileText, DollarSign, CheckCircle,
  MessageSquare, Search, Star, FileCheck, Mail, Phone, MapPin,
} from "lucide-react";
import EliteButton from "@/components/ui/EliteButton";

// ─── Design Tokens ──────────────────────────────────────────────────
const C = {
  bg:         "#050506",
  bgSoft:     "#0a0b0d",
  panel:      "#0d0e11",
  panelSoft:  "#111316",
  border:     "rgba(255,255,255,0.08)",
  borderGold: "rgba(210,163,95,0.25)",
  text:       "#f5f1e8",
  textSoft:   "#a6adbb",
  textMuted:  "#6f7683",
  gold:       "#d2a35f",
  goldHover:  "#e0b874",
};

// ─── Reusable Atoms ──────────────────────────────────────────────────

function SectionLabel({ children, centered = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, justifyContent: centered ? "center" : "flex-start" }}>
      <div style={{ width: 24, height: 1, background: C.gold, opacity: 0.8 }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, fontFamily: "Inter, sans-serif" }}>
        {children}
      </span>
      {centered && <div style={{ width: 24, height: 1, background: C.gold, opacity: 0.8 }} />}
    </div>
  );
}

function GoldBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "14px 28px",
        background: hov ? C.goldHover : C.gold,
        color: "#050506", border: "none", borderRadius: 6,
        fontSize: 14, fontWeight: 700, cursor: "pointer",
        transition: "background 0.18s ease",
        fontFamily: "Inter, sans-serif",
        ...style,
      }}>
      {children}
    </button>
  );
}

function OutlineBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "14px 28px",
        background: hov ? "rgba(255,255,255,0.02)" : "transparent",
        color: C.text,
        border: `1px solid ${hov ? "rgba(210,163,95,0.4)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "Inter, sans-serif",
        ...style,
      }}>
      {children}
    </button>
  );
}

function ServiceCard({ icon: Icon, title, desc }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.panel,
        border: `1px solid ${hov ? C.borderGold : C.border}`,
        borderRadius: 10, padding: "28px 24px",
        display: "flex", flexDirection: "column", gap: 16,
        transition: "border-color 0.2s ease", cursor: "default",
      }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: "rgba(210,163,95,0.1)", border: "1px solid rgba(210,163,95,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", color: C.gold,
      }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.35, fontFamily: "Inter, sans-serif" }}>{title}</p>
        <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif" }}>{desc}</p>
      </div>
    </div>
  );
}

function WhyCard({ num, icon: Icon, title, desc }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.panel,
        border: `1px solid ${hov ? C.borderGold : C.border}`,
        borderRadius: 10, padding: "24px",
        transition: "border-color 0.2s ease", cursor: "default",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "rgba(210,163,95,0.1)", border: "1px solid rgba(210,163,95,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, flexShrink: 0,
        }}>
          <Icon style={{ width: 15, height: 15 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textMuted, fontFamily: "Inter, sans-serif" }}>{num}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "Inter, sans-serif" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif" }}>{desc}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ── NAV ─────────────────────────────────────────────────────────────
  const navLinks = ["Platform", "Features", "Process", "Testimonials", "FAQ", "Contact"];

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      {/* NAV */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 64,
        background: "rgba(5,5,6,0.96)",
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 6,
            background: "rgba(210,163,95,0.12)", border: `1px solid ${C.borderGold}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: C.gold,
          }}>E</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif", letterSpacing: "0.06em" }}>ELITETC</div>
            <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: "0.14em", color: C.textMuted, textTransform: "uppercase" }}>Transaction Coordination</div>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
          {navLinks.map(item => (
            <button key={item} onClick={() => scrollTo(item.toLowerCase().replace(/\s+/g, "-"))}
              style={{ background: "none", border: "none", fontSize: 13, color: C.textSoft, cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textSoft}>
              {item}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isMobile && (
            <EliteButton variant="ghost" size="sm" onClick={() => scrollTo("contact")}>
              Schedule Consultation
            </EliteButton>
          )}
          <EliteButton variant="ghost" size="sm" onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
            Sign In
          </EliteButton>
          <EliteButton variant="gold" size="sm" onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
            Get Started
          </EliteButton>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "auto", display: "flex", alignItems: "center",
        padding: "80px 20px 60px", position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }} />
        {/* Radial fade */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(210,163,95,0.04) 0%, transparent 70%)",
        }} />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", alignItems: "center", position: "relative", zIndex: 1 }}>

          {/* LEFT */}
          <div>
            <SectionLabel>AI-Powered Transaction Coordination</SectionLabel>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(58px, 7vw, 88px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              Smarter Deals.
            </h1>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(58px, 7vw, 88px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 36px", letterSpacing: "-0.01em" }}>
              Fewer Errors.
            </h1>

            <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.75, maxWidth: 480, marginBottom: 32 }}>
              EliteTC is a full-stack transaction coordination platform built for real estate professionals. AI-assisted contract parsing, automated deadline tracking, compliance monitoring, and centralized deal management — contract to close.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {[
                "AI contract parsing — extract dates, parties, prices instantly",
                "Automated deadline engine with overdue alerts",
                "Compliance monitoring, signature checks & risk detection",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft }}>
                  <CheckCircle style={{ width: 16, height: 16, color: C.gold, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 32 }}>
              <EliteButton
                variant="gold"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => base44.auth.redirectToLogin("/Dashboard")}
              >
                Start Your Transaction Workflow
              </EliteButton>
              <EliteButton
                variant="ghost"
                size="lg"
                onClick={() => scrollTo("contact")}
              >
                Schedule a Demo
              </EliteButton>
            </div>

            <NavTextBtn onClick={() => scrollTo("services")}>
              Explore the Platform <ArrowRight style={{ width: 14, height: 14 }} />
            </NavTextBtn>
          </div>

          {/* RIGHT — Metrics card */}
          <div style={{
            background: "rgba(13,14,17,0.9)", backdropFilter: "blur(10px)",
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 18, padding: "36px 32px",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, marginBottom: 28, fontFamily: "Inter, sans-serif" }}>
              Platform Capabilities
            </p>
            {[
              { label: "Contract Fields Auto-Extracted", value: "14+" },
              { label: "Deadline Rules Enforced",        value: "100%" },
              { label: "Time Saved Per Transaction",     value: "15hrs" },
            ].map(({ label, value }, i) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
                  <span style={{ fontSize: 14, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>{label}</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: C.gold }}>{value}</span>
                </div>
                {i < 2 && <div style={{ height: 1, background: C.border }} />}
              </div>
            ))}
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 20, lineHeight: 1.65, fontFamily: "Inter, sans-serif" }}>
              Built for transaction coordinators, independent agents, and real estate teams in NH and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── THE ELITETC DIFFERENCE ───────────────────────────────────── */}
      <section id="platform" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          {/* Left */}
          <div>
            <SectionLabel>The EliteTC Difference</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 2px" }}>
              Built for the Way
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 28px" }}>
              Real Estate Works.
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 36, maxWidth: 360, fontFamily: "Inter, sans-serif" }}>
              EliteTC is not a generic project management tool repurposed for real estate. Every workflow, deadline rule, compliance check, and document parser was designed around the actual mechanics of a real estate transaction — from Purchase & Sale to the closing table.
            </p>
            <div style={{
              background: "rgba(210,163,95,0.06)", border: `1px solid ${C.borderGold}`,
              borderRadius: 10, padding: "24px 26px",
            }}>
              <p style={{ fontSize: 14, color: C.textSoft, fontStyle: "italic", lineHeight: 1.75, margin: 0, fontFamily: "'Playfair Display', serif" }}>
                "Top-performing TCs don't juggle spreadsheets and email threads. They run structured systems that enforce every deadline automatically."
              </p>
            </div>
          </div>

          {/* Right — 3 feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: ShieldCheck, title: "AI-Driven Contract Intake",    desc: "Upload a Purchase & Sale Agreement and the platform auto-extracts buyer/seller names, agents, price, deadlines, title company, and commission — no manual entry required." },
              { icon: FileText,    title: "Deterministic Deadline Engine", desc: "Every contingency, inspection window, financing deadline, and closing date is tracked by a centralized rule engine. Overdue alerts fire automatically — no configuration needed." },
              { icon: Users,       title: "Role-Aware Access Control",     desc: "Owners, TCs, agents, and clients each see exactly what they need. Data isolation is enforced at the record level so every file stays private and protected." },
            ].map(({ icon: Icon, title, desc }) => (
              <DiffCard key={title} icon={Icon} title={title} desc={desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── SERVICES ────────────────────────────────────────────────── */}
      <section id="services" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 4px" }}>
              Everything Your <span style={{ color: C.gold, fontStyle: "italic" }}>Transaction</span>
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 24px" }}>
              Needs. In One Platform.
            </h2>
            <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 580, lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
              EliteTC combines AI document parsing, automated deadline enforcement, compliance monitoring, and full deal management into a single operational platform — built specifically for real estate.
            </p>
          </div>

          {/* Row 1: 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ServiceCard icon={FileText}      title="AI Contract Parsing"            desc="Upload a P&S Agreement and the platform intelligently extracts buyer/seller names, purchase price, EMD, inspection deadlines, financing dates, title company, and commission structure — automatically." />
            <ServiceCard icon={ShieldCheck}   title="Compliance Engine"              desc="Built-in compliance monitoring checks every transaction for missing signatures, required initials, incomplete fields, and state-specific requirements. Issues surface before they become problems." />
            <ServiceCard icon={Clock}         title="Automated Deadline Tracking"    desc="The centralized deadline engine calculates and enforces inspection periods, financing contingencies, EMD deadlines, appraisal windows, and closing dates — with automatic overdue alerts." />
          </div>
          {/* Row 2: 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ServiceCard icon={MessageSquare} title="Communication & Notifications"  desc="Automated reminders, task alerts, and deadline notifications keep every party — agents, clients, lenders, and title — aligned without manual follow-up." />
            <ServiceCard icon={LayoutDashboard} title="Transaction Dashboard"         desc="A single operational hub showing all active transactions, phase progress, risk levels, health scores, and pending actions across your entire portfolio." />
            <ServiceCard icon={Search}        title="Document Management"            desc="Upload, review, and track documents by type and phase. The checklist engine flags missing required documents at every stage of the transaction." />
            <ServiceCard icon={Users}         title="Contact & Vendor Management"    desc="Persistent contact database with automatic importing from transactions. Track lenders, title companies, inspectors, attorneys, and agents across all deals." />
          </div>
          {/* Row 3: 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ServiceCard icon={DollarSign}    title="Commission Management"          desc="Generate title-ready commission statements, track gross and net commission, manage buyer/seller side splits, referral fees, and TC fees — all from within the transaction." />
            <ServiceCard icon={Zap}           title="Workflow Automation"            desc="Automated task generation, phase detection, under-contract workflows, and Google Calendar sync eliminate repetitive coordination work for every deal." />
            <ServiceCard icon={Star}          title="Secure Account Isolation"       desc="Owner-based transaction visibility, role-aware access controls, and record-level data isolation ensure every TC and agent sees only what they should." />
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── WHY ELITETC ─────────────────────────────────────────────── */}
      <section id="features" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          {/* Left */}
          <div>
            <SectionLabel>Why EliteTC</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Precision</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              At Every<br />Stage
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 32, fontFamily: "Inter, sans-serif" }}>
              Every feature in EliteTC was built around a real problem in the transaction coordination workflow — from the moment a contract lands to the day it closes.
            </p>
            <div style={{ height: 1, background: C.border, marginBottom: 28 }} />
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "22px 24px",
            }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: C.gold, margin: "0 0 6px", fontStyle: "italic" }}>14+</p>
              <p style={{ fontSize: 13, color: C.textSoft, margin: 0, fontFamily: "Inter, sans-serif" }}>Contract fields extracted automatically by the AI parser</p>
            </div>
          </div>

          {/* Right — 2×3 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <WhyCard num="01" icon={Zap}           title="AI Contract Intake"             desc="Upload a Purchase & Sale Agreement. The AI parser extracts buyer/seller names, agents, brokerages, purchase price, EMD, inspection dates, financing deadlines, closing date, title company, and commission — no manual entry." />
            <WhyCard num="02" icon={Clock}          title="Deadline Intelligence Engine"   desc="A deterministic rules engine tracks every contingency and calculates urgency in real time. Overdue alerts, upcoming deadline warnings, and compliance triggers fire automatically." />
            <WhyCard num="03" icon={ShieldCheck}    title="Compliance Monitoring"          desc="Missing signatures, incomplete fields, and document gaps are flagged before they become closing-day problems. Risk scores surface the transactions that need attention most." />
            <WhyCard num="04" icon={MessageSquare}  title="Automated Communications"       desc="Task alerts, deadline reminders, phase-change notifications, and weekly summaries keep agents, TCs, and clients informed — without manual follow-up." />
            <WhyCard num="05" icon={Star}           title="Commission Statement Generation" desc="Generate title-ready commission breakdowns including gross commission, brokerage splits, referral fees, TC fees, and net agent compensation directly from the transaction." />
            <WhyCard num="06" icon={CheckCircle2}   title="Secure, Isolated Accounts"      desc="Owner-based data isolation ensures every TC and agent sees only their own transactions. Role-aware permissions enforce the right level of access at every layer." />
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="process" style={{ background: C.bg, position: "relative", overflow: "hidden" }} className="py-16 md:py-28 px-5 md:px-16">
        {/* Faint radial */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(210,163,95,0.03) 0%, transparent 70%)" }} />

        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <SectionLabel centered>How It Works</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 4px" }}>
            From Contract Upload
          </h2>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 24px" }}>
            to Closing Table.
          </h2>
          <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 520, margin: "0 auto 72px", lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
            A structured, automated workflow that handles every operational detail — from the first document to final disbursement.
          </p>

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-8 md:gap-0" style={{ position: "relative", alignItems: "flex-start" }}>
            {/* Connecting line */}
            <div style={{
              position: "absolute", top: 30, left: "10%", right: "10%", height: 1,
              background: `linear-gradient(90deg, transparent, ${C.borderGold}, ${C.borderGold}, transparent)`,
              zIndex: 0,
            }} />

            {[
              { num: "1", icon: Upload,       title: "Upload Your Contract",      desc: "Submit your executed Purchase & Sale Agreement. The AI parser instantly extracts all critical transaction data — no manual entry required." },
              { num: "2", icon: FileCheck,     title: "AI Parses & Populates",     desc: "Buyer/seller names, agents, purchase price, EMD, inspection deadlines, financing dates, title company, and commission are auto-populated into your transaction record." },
              { num: "3", icon: Clock,         title: "Deadlines Auto-Calculated", desc: "The deadline engine builds your full transaction timeline. Every contingency is tracked with urgency levels and automated alerts for overdue items." },
              { num: "4", icon: Users,         title: "Team & Parties Coordinated", desc: "TCs, agents, lenders, title companies, and inspectors stay aligned through automated notifications, task assignments, and activity tracking." },
              { num: "5", icon: CheckCircle2,  title: "Closed & Compliant",        desc: "Commission statements generated, compliance verified, documents archived. Your transaction closes on time and in full compliance." },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 12px", position: "relative", zIndex: 1 }}>
                {/* Circle */}
                <div style={{
                  width: 62, height: 62, borderRadius: "50%",
                  background: C.panel, border: `1px solid ${C.borderGold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20, position: "relative",
                }}>
                  <Icon style={{ width: 22, height: 22, color: C.gold }} />
                  {/* Number badge */}
                  <div style={{
                    position: "absolute", top: -7, right: -7,
                    width: 20, height: 20, borderRadius: "50%",
                    background: C.gold, color: "#050506",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Inter, sans-serif",
                  }}>{num}</div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10, lineHeight: 1.35, fontFamily: "Inter, sans-serif" }}>{title}</p>
                <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.65, margin: 0, fontFamily: "Inter, sans-serif" }}>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 64 }}>
            <EliteButton
              variant="gold"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => base44.auth.redirectToLogin("/Dashboard")}
            >
              Automate Your Contract-to-Close Process
            </EliteButton>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionLabel>From the Field</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 8px" }}>
            Real Workflows. <span style={{ color: C.gold, fontStyle: "italic" }}>Real Results.</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textSoft, maxWidth: 480, lineHeight: 1.75, marginBottom: 52, fontFamily: "Inter, sans-serif" }}>
            From independent TCs to high-volume teams — real estate professionals running contract-heavy operations every day.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { quote: "The AI contract parser alone saves me 45 minutes per file. I upload the P&S and every deadline, party name, and commission figure is already in the system. I don't touch a keyboard until I'm reviewing the output.", name: "Sarah M.", role: "Transaction Coordinator · Portsmouth, NH", badge: "80+ transactions/year" },
              { quote: "The compliance engine caught a missing buyer initial on page 7 before I submitted to the brokerage. That's the kind of thing that comes back to haunt you at closing. EliteTC flagged it in seconds.", name: "James R.", role: "Team Lead · Manchester, NH", badge: "200+ transactions/year" },
              { quote: "I run all of my buyer and listing transactions through EliteTC. The deadline tracking and automated reminders mean I never have to chase a financing contingency date manually. It's just handled.", name: "Linda K.", role: "Independent Agent · Concord, NH", badge: "NH Residential Specialist" },
              { quote: "I was manually tracking every deadline in a spreadsheet. Now the platform sends me alerts before anything goes overdue. The transaction health scoring tells me exactly which files need attention first.", name: "Marcus T.", role: "Senior TC · Nashua, NH", badge: "Multi-team coordinator" },
            ].map(({ quote, name, role, badge }) => (
              <TestimonialCard key={name} quote={quote} name={name} role={role} badge={badge} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          <div>
            <SectionLabel>FAQ</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Platform</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 24px" }}>Questions</h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.75, maxWidth: 260, marginBottom: 20, fontFamily: "Inter, sans-serif" }}>
              Common questions about how EliteTC works — from AI parsing to deadline tracking to compliance.
            </p>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Don't see your question?</p>
            <button onClick={() => scrollTo("contact")} style={{ background: "none", border: "none", color: C.gold, fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", textDecoration: "underline", textDecorationColor: "rgba(210,163,95,0.4)" }}>
              Contact us directly
            </button>
          </div>

          <div>
            {[
              { q: "What transaction types does the platform support?",                a: "EliteTC supports buyer-side, listing-side, and dual agency transactions for residential, condo, multifamily, commercial, and land deals. NH-specific workflows and compliance rules are built in." },
              { q: "How does the AI contract parser work?",                            a: "Upload a Purchase & Sale Agreement (PDF) and the platform uses AI-powered OCR and document intelligence to extract buyer/seller names, agents, brokerages, purchase price, EMD amount, inspection deadlines, financing dates, appraisal windows, closing date, title company information, and commission structure — automatically populating your transaction record." },
              { q: "How does deadline tracking work?",                                 a: "The centralized deadline engine calculates all critical dates from your contract data and continuously monitors them. As deadlines approach, the system fires severity-tiered alerts (notice → warning → urgent → critical) and flags overdue items on your dashboard." },
              { q: "What does the compliance engine check?",                           a: "The compliance engine monitors for missing required documents, unsigned or un-initialed fields, incomplete contingency data, missing contact information, and transaction-type-specific compliance requirements. Issues are surfaced with severity scores so you know what to fix first." },
              { q: "Who can access my transactions?",                                  a: "EliteTC enforces owner-based data isolation. Each user sees only the transactions they own or have been explicitly granted access to. Role-aware permissions (owner, TC, agent, client) determine what actions each party can take." },
              { q: "Does EliteTC integrate with Google Calendar?",                     a: "Yes. Transaction deadlines can be synced to Google Calendar automatically, keeping your closing timeline visible alongside your other commitments." },
              { q: "Can I manage contacts and vendors across transactions?",            a: "Yes. EliteTC includes a persistent contact database. Contacts are automatically importable from transactions, and you can track lenders, title companies, inspectors, attorneys, and agents with full contact records reusable across deals." },
              { q: "How are commission statements generated?",                         a: "From within any transaction, you can generate a title-ready commission statement that calculates gross commission, brokerage splits, referral fees, TC fees, and net agent compensation. Statements can be sent directly to the title company." },
            ].map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── CONTACT ─────────────────────────────────────────────────── */}
      <section id="contact" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          {/* Left */}
          <div>
            <SectionLabel>Get Started</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Centralize</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              Every Transaction<br />In One Place.
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, maxWidth: 320, marginBottom: 36, fontFamily: "Inter, sans-serif" }}>
              Whether you're managing one deal or a full pipeline, EliteTC gives you the AI tools, automation, and compliance infrastructure to run every transaction with precision.
            </p>

            {[
              { icon: Mail,    text: "info@elitetc.com" },
              { icon: Phone,   text: "(800) 555-0192" },
              { icon: MapPin,  text: "Serving agents nationwide" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: "rgba(210,163,95,0.1)", border: `1px solid ${C.borderGold}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, flexShrink: 0 }}>
                  <Icon style={{ width: 14, height: 14 }} />
                </div>
                <span style={{ fontSize: 13, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>{text}</span>
              </div>
            ))}

            <div style={{ marginTop: 28, background: "rgba(210,163,95,0.06)", border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, flexShrink: 0, marginTop: 3 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gold, margin: "0 0 3px", fontFamily: "Inter, sans-serif" }}>Response within 1 business day</p>
                <p style={{ fontSize: 12, color: C.textMuted, margin: 0, fontFamily: "Inter, sans-serif" }}>All inquiries are reviewed by a senior coordinator.</p>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 24px" }}>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField label="FULL NAME *"     placeholder="Your full name" />
              <FormField label="EMAIL ADDRESS *" placeholder="your@email.com" type="email" />
              <FormField label="PHONE NUMBER"    placeholder="(555) 000-0000" type="tel" />
              <FormSelect label="I AM A" placeholder="Select your role" options={["Independent Agent", "Team Lead", "Broker/Owner", "Transaction Coordinator"]} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <FormSelect label="SERVICE NEEDED" placeholder="Select a service" options={["Contract-to-Close Coordination", "Compliance Management", "Full Transaction Management"]} fullWidth />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.textMuted, marginBottom: 7, fontFamily: "Inter, sans-serif" }}>MESSAGE</label>
              <textarea rows={4} placeholder="Tell us about your transaction volume, current challenges, or any specific needs..."
                style={{ width: "100%", background: "rgba(8,9,11,0.95)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 7, padding: "11px 13px", fontSize: 13, color: C.text, outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif", lineHeight: 1.65 }} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <EliteButton
                variant="gold"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => base44.auth.redirectToLogin("/Dashboard")}
              >
                Manage Every Deadline in One Place
              </EliteButton>
              <EliteButton
                variant="secondary"
                size="md"
                onClick={() => base44.auth.redirectToLogin("/Dashboard")}
              >
                Sign In
              </EliteButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}` }} className="px-5 md:px-16 pt-14 md:pt-16 pb-8">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-16 mb-12">
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(210,163,95,0.12)", border: `1px solid ${C.borderGold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.gold }}>E</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif", letterSpacing: "0.06em" }}>ELITETC</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase" }}>Transaction Coordination</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.75, maxWidth: 240, marginBottom: 18, fontFamily: "Inter, sans-serif" }}>
                AI-powered transaction coordination platform built for real estate professionals, transaction coordinators, and high-volume teams.
              </p>
              <p style={{ fontSize: 13, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>info@elitetc.com</p>
              <p style={{ fontSize: 13, color: C.textSoft, marginTop: 4, fontFamily: "Inter, sans-serif" }}>(800) 555-0192</p>
            </div>

            {[
              { label: "Platform",    items: ["AI Contract Parsing", "Deadline Engine", "Compliance Monitoring", "Commission Statements", "Contact Management", "Document Management"] },
              { label: "Company",     items: ["Why EliteTC", "How It Works", "Testimonials", "FAQ"] },
              { label: "Get Started", items: ["Start a Transaction", "Schedule a Demo", "Contact Us", "Sign In"] },
            ].map(({ label, items }) => (
              <div key={label}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 22, fontFamily: "Inter, sans-serif" }}>{label}</p>
                {items.map(l => <p key={l} style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</p>)}
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: C.border, marginBottom: 24 }} />
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p style={{ fontSize: 12, color: C.textMuted, fontFamily: "Inter, sans-serif" }}>© 2026 EliteTC. All rights reserved.</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacy Policy", "Terms of Service"].map(l => <span key={l} style={{ fontSize: 12, color: C.textMuted, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</span>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components (defined after main export) ──────────────────────

function NavTextBtn({ children, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "none", border: "none", color: "#d2a35f", fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0, opacity: h ? 0.7 : 1, transition: "opacity 0.15s", fontFamily: "Inter, sans-serif" }}>
      {children}
    </button>
  );
}

function DiffCard({ icon: Icon, title, desc }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#0d0e11", border: `1px solid ${hov ? "rgba(210,163,95,0.25)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10, padding: "20px 22px",
        display: "flex", alignItems: "flex-start", gap: 18,
        transition: "border-color 0.2s ease", cursor: "default",
      }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(210,163,95,0.1)", border: "1px solid rgba(210,163,95,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#d2a35f", flexShrink: 0 }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#f5f1e8", marginBottom: 7, fontFamily: "Inter, sans-serif" }}>{title}</p>
        <p style={{ fontSize: 13, color: "#a6adbb", lineHeight: 1.7, margin: 0, fontFamily: "Inter, sans-serif" }}>{desc}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, name, role, badge }) {
  return (
    <div style={{ background: "#0d0e11", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "32px" }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
        {[1,2,3,4,5].map(i => <Star key={i} style={{ width: 13, height: 13, color: "#d2a35f", fill: "#d2a35f" }} />)}
      </div>
      <p style={{ fontSize: 14, color: "#a6adbb", fontStyle: "italic", lineHeight: 1.8, marginBottom: 24, fontFamily: "'Playfair Display', serif" }}>"{quote}"</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f5f1e8", marginBottom: 3, fontFamily: "Inter, sans-serif" }}>{name}</p>
          <p style={{ fontSize: 12, color: "#6f7683", fontFamily: "Inter, sans-serif" }}>{role}</p>
        </div>
        <div style={{ fontSize: 11, color: "#6f7683", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontFamily: "Inter, sans-serif" }}>{badge}</div>
      </div>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button onClick={onToggle}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
        <span style={{ fontSize: 14, color: open ? "#f5f1e8" : "#a6adbb", transition: "color 0.15s", fontFamily: "Inter, sans-serif", lineHeight: 1.45 }}>{q}</span>
        <div style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: open ? "#d2a35f" : "#6f7683", fontSize: 16, fontWeight: 300, flexShrink: 0, transition: "color 0.15s" }}>
          {open ? "−" : "+"}
        </div>
      </button>
      {open && (
        <p style={{ fontSize: 13, color: "#a6adbb", lineHeight: 1.75, padding: "0 40px 20px 0", margin: 0, fontFamily: "Inter, sans-serif" }}>{a}</p>
      )}
    </div>
  );
}

function FormField({ label, placeholder, type = "text", fullWidth = false }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
      <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6f7683", marginBottom: 7, fontFamily: "Inter, sans-serif" }}>{label}</label>
      <input type={type} placeholder={placeholder}
        style={{ width: "100%", background: "rgba(8,9,11,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "11px 13px", fontSize: 13, color: "#f5f1e8", outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }} />
    </div>
  );
}

function FormSelect({ label, placeholder, options, fullWidth = false }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
      <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6f7683", marginBottom: 7, fontFamily: "Inter, sans-serif" }}>{label}</label>
      <select style={{ width: "100%", background: "rgba(8,9,11,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "11px 13px", fontSize: 13, color: "#a6adbb", outline: "none", fontFamily: "Inter, sans-serif", appearance: "auto" }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}