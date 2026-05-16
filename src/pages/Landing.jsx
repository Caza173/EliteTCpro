import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, Upload, Clock, ShieldCheck,
  Users, LayoutDashboard, CheckCircle2, Zap,
  FileText, DollarSign, CheckCircle,
  MessageSquare, Search, Star, FileCheck, Mail, Phone, MapPin,
  Brain, Bell, Calendar, Lock, BookUser, Activity,
} from "lucide-react";

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

  const navLinks = ["Features", "Why EliteTC", "How It Works", "Testimonials", "FAQ", "Contact"];
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
            <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: "0.14em", color: C.textMuted, textTransform: "uppercase" }}>AI Transaction Platform</div>
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
          <OutlineBtn onClick={() => scrollTo("contact")} style={{ padding: "8px 14px", fontSize: 12, display: isMobile ? "none" : "inline-flex" }}>
            Schedule Consultation
          </OutlineBtn>
          <button
            onClick={() => base44.auth.redirectToLogin("/Dashboard")}
            style={{ background: "none", border: "none", color: C.textSoft, fontSize: 13, cursor: "pointer", padding: "8px 12px", fontFamily: "Inter, sans-serif", borderRadius: 6, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textSoft}
          >
            Login
          </button>
          <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")} style={{ padding: "8px 16px", fontSize: 13 }}>
            Get Started
          </GoldBtn>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "auto", display: "flex", alignItems: "center",
        padding: "80px 20px 60px", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(210,163,95,0.04) 0%, transparent 70%)",
        }} />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", alignItems: "center", position: "relative", zIndex: 1 }}>

          {/* LEFT */}
          <div>
            <SectionLabel>AI-Powered Transaction Coordination</SectionLabel>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(52px, 7vw, 80px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              Automate the Work.
            </h1>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(52px, 7vw, 80px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 36px", letterSpacing: "-0.01em" }}>
              Close Every Deal.
            </h1>

            <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.75, maxWidth: 500, marginBottom: 32 }}>
              EliteTC is a full AI transaction coordination platform — built specifically for real estate professionals. Upload a contract and the platform handles parsing, deadline tracking, compliance, task generation, and communication from day one.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {[
                "AI contract parsing — names, dates, deadlines extracted automatically",
                "Deterministic deadline engine with overdue alerts & calendar sync",
                "Compliance monitoring, risk scoring & missing signature detection",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft }}>
                  <CheckCircle style={{ width: 16, height: 16, color: C.gold, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 32 }}>
              <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Upload Your First Contract <ArrowRight style={{ width: 15, height: 15 }} />
              </GoldBtn>
              <OutlineBtn onClick={() => scrollTo("contact")}>
                Schedule a Consultation
              </OutlineBtn>
            </div>

            <NavTextBtn onClick={() => scrollTo("features")}>
              Explore Platform Features <ArrowRight style={{ width: 14, height: 14 }} />
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
              { label: "Contracts Auto-Parsed",    value: "30+" },
              { label: "Deadline Fields Tracked",  value: "14+" },
              { label: "Compliance Rules Active",  value: "10+" },
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
              Purpose-built for transaction coordinators, real estate teams, and independent agents operating at scale in NH and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── AI CONTRACT PARSING SPOTLIGHT ───────────────────────────── */}
      <section id="features" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          <div>
            <SectionLabel>AI Contract Intake</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 2px" }}>
              Upload a Contract.
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 28px" }}>
              We Handle the Rest.
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 36, maxWidth: 380, fontFamily: "Inter, sans-serif" }}>
              EliteTC uses AI-powered OCR and intelligent document parsing to extract critical transaction data directly from Purchase & Sale Agreements — no manual data entry required.
            </p>
            <div style={{
              background: "rgba(210,163,95,0.06)", border: `1px solid ${C.borderGold}`,
              borderRadius: 10, padding: "24px 26px",
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 14, fontFamily: "Inter, sans-serif" }}>Automatically extracted from uploaded contracts:</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  "Buyer & seller names", "Agent & brokerage info",
                  "Purchase price", "EMD / deposit amounts",
                  "Inspection deadline", "Due diligence dates",
                  "Financing contingency", "Closing date",
                  "Title company details", "Commission structure",
                  "Property address", "MLS number",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>
                    <CheckCircle style={{ width: 12, height: 12, color: C.gold, flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: Brain,       title: "Intelligent Document Recognition",   desc: "Supports residential, multifamily, commercial, land, and buyer agency agreements. The AI identifies the document type before extraction begins." },
              { icon: FileText,    title: "NH-Specific Workflow Compliance",     desc: "Built around New Hampshire transaction workflows. Contract fields, compliance rules, and deadline logic reflect NH-specific real estate requirements." },
              { icon: Zap,         title: "Instant Transaction Population",      desc: "Extracted fields auto-populate the transaction record — deadlines, contacts, financial data, and phase state are ready immediately after upload." },
              { icon: ShieldCheck, title: "Review & Override Control",           desc: "All AI-parsed fields are reviewable and editable. Every extraction is logged for audit and version history, giving coordinators full control." },
            ].map(({ icon: Icon, title, desc }) => (
              <DiffCard key={title} icon={Icon} title={title} desc={desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── PLATFORM FEATURES ───────────────────────────────────────── */}
      <section id="platform" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 60 }}>
            <SectionLabel>Full Platform Capabilities</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 4px" }}>
              Every Tool a <span style={{ color: C.gold, fontStyle: "italic" }}>Modern TC</span>
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 24px" }}>
              Actually Needs
            </h2>
            <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 600, lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
              From the moment a contract is uploaded to the day keys are handed over, EliteTC manages every operational layer — intelligently, automatically, and with full auditability.
            </p>
          </div>

          {/* Row 1: 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ServiceCard icon={Brain}         title="AI Contract Parsing"              desc="Upload a P&S or listing agreement and watch fields populate automatically. Buyer, seller, dates, deadlines, commissions — extracted in seconds via OCR and intelligent parsing." />
            <ServiceCard icon={Clock}         title="Deadline Intelligence Engine"     desc="A centralized, deterministic deadline engine tracks inspection, financing, appraisal, EMD, due diligence, and closing dates — with automatic overdue detection and severity alerts." />
            <ServiceCard icon={ShieldCheck}   title="Compliance Monitoring"            desc="10+ active compliance rules continuously evaluate each transaction. Missing signatures, unchecked initials, overdue items, and risk conditions are surfaced immediately." />
          </div>
          {/* Row 2: 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ServiceCard icon={LayoutDashboard} title="Transaction Dashboard"          desc="A real-time command center for every active transaction. Phase tracking, health scores, risk levels, and activity feeds in one unified view." />
            <ServiceCard icon={Bell}           title="Automated Notifications"         desc="Email and in-app alerts fire automatically as deadlines approach. Configurable urgency levels — notice, warning, urgent, critical — keep all parties informed without manual follow-up." />
            <ServiceCard icon={Calendar}       title="Google Calendar Sync"            desc="Transaction deadlines sync directly to Google Calendar. TCs and agents stay aligned without switching platforms or manual calendar management." />
            <ServiceCard icon={FileCheck}      title="Document Management"             desc="Secure document storage, checklist tracking, and document-type recognition with AI-powered matching to transaction requirements." />
          </div>
          {/* Row 3: 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ServiceCard icon={BookUser}       title="Contact & Vendor CRM"            desc="A persistent contact database that auto-imports from transactions. Track lenders, title companies, inspectors, and agents with reusable, categorized records." />
            <ServiceCard icon={DollarSign}     title="Commission Management"           desc="Full commission tracking with gross/net calculation, brokerage split support, buyer/seller side compensation, and title-ready commission statement generation." />
            <ServiceCard icon={MessageSquare}  title="Communication Workflows"         desc="Automated email templates for contract milestones, deadline reminders, utility requests, Zillow review outreach, and under-contract announcements." />
            <ServiceCard icon={Activity}       title="Activity Feed & Audit Log"       desc="Every action — task completion, document upload, phase change, field edit — is logged with actor, timestamp, and before/after state for full auditability." />
          </div>
          {/* Row 4: 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ServiceCard icon={Lock}           title="Isolated Account Security"       desc="Role-aware access controls, owner-based transaction visibility, and protected data architecture ensure each user only sees what they're authorized to access." />
            <ServiceCard icon={Users}          title="Team & TC Management"            desc="Assign TCs to transactions, manage brokerage teams, and control role-based access across owner, TC lead, TC, agent, and client roles." />
            <ServiceCard icon={Search}         title="Signature & DocuSign Integration" desc="Send documents for e-signature via Dropbox Sign or DocuSign. Track signer status, completion, and blocking conditions in real time." />
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── WHY ELITETC ─────────────────────────────────────────────── */}
      <section id="why-elitetc" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          <div>
            <SectionLabel>Why EliteTC</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Built for</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              TCs Who<br />Operate at Scale
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 32, fontFamily: "Inter, sans-serif" }}>
              Transaction coordinators running high volumes need more than a checklist. EliteTC replaces fragmented tools with a single, intelligent platform that handles the operational complexity of modern real estate workflows.
            </p>
            <div style={{ height: 1, background: C.border, marginBottom: 28 }} />
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "22px 24px",
            }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: C.gold, margin: "0 0 6px", fontStyle: "italic" }}>14+</p>
              <p style={{ fontSize: 13, color: C.textSoft, margin: 0, fontFamily: "Inter, sans-serif" }}>Deadline fields tracked per transaction, automatically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <WhyCard num="01" icon={Brain}          title="AI That Does Real Work"             desc="Contract parsing isn't a demo feature — it extracts 12+ fields from uploaded P&S agreements and populates your transaction instantly. No copy-paste, no manual entry." />
            <WhyCard num="02" icon={Clock}          title="Deadlines Never Slip"               desc="The deadline engine evaluates every tracked date — inspection, financing, appraisal, EMD, due diligence, closing — and fires tiered alerts before anything becomes critical." />
            <WhyCard num="03" icon={ShieldCheck}    title="Compliance Built In"                desc="10+ deterministic compliance rules run on every transaction. Missing initials, unsigned fields, overdue documents, and risk conditions are surfaced without waiting for a review." />
            <WhyCard num="04" icon={Lock}           title="Secure by Architecture"             desc="Owner-based transaction isolation, role-aware visibility, and protected workflows mean every coordinator, agent, and client only accesses what they're authorized to see." />
            <WhyCard num="05" icon={Activity}       title="Full Transaction Visibility"        desc="Phase tracking, health scores, risk levels, activity feeds, and audit logs give coordinators and TC leads complete real-time visibility across their entire deal pipeline." />
            <WhyCard num="06" icon={BookUser}       title="CRM-Connected Workflows"            desc="Contacts from transactions auto-import into a persistent database. Lenders, title reps, inspectors, and agents are reusable across every deal — no re-entering data." />
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: C.bg, position: "relative", overflow: "hidden" }} className="py-16 md:py-28 px-5 md:px-16">
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(210,163,95,0.03) 0%, transparent 70%)" }} />

        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <SectionLabel centered>How It Works</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 4px" }}>
            Contract In.
          </h2>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 24px" }}>
            Closing Out.
          </h2>
          <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 520, margin: "0 auto 72px", lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
            A structured, automated workflow that takes a transaction from executed contract to closed file — with every step tracked, compliant, and visible.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-8 md:gap-0" style={{ position: "relative", alignItems: "flex-start" }}>
            <div style={{
              position: "absolute", top: 30, left: "10%", right: "10%", height: 1,
              background: `linear-gradient(90deg, transparent, ${C.borderGold}, ${C.borderGold}, transparent)`,
              zIndex: 0,
            }} />

            {[
              { num: "1", icon: Upload,       title: "Upload Your Contract",          desc: "Submit a P&S agreement, listing agreement, or buyer agency agreement through the secure intake portal. AI parsing begins immediately." },
              { num: "2", icon: Brain,         title: "AI Extracts Everything",       desc: "Buyer, seller, agents, deadlines, commissions, title info — extracted automatically. The transaction record is populated without manual entry." },
              { num: "3", icon: Clock,         title: "Deadlines & Tasks Activated",  desc: "A deadline timeline and task checklist are generated automatically. Every contingency, inspection period, and closing date is tracked from day one." },
              { num: "4", icon: Bell,          title: "Automated Alerts Fire",        desc: "As deadlines approach, tiered notifications go out to TCs, agents, and clients. Compliance issues are flagged before they become problems." },
              { num: "5", icon: CheckCircle2,  title: "Transaction Closed",           desc: "Final documents verified, commission tracked, closing confirmed. Full audit log preserved. File archived and reporting updated." },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 12px", position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 62, height: 62, borderRadius: "50%",
                  background: C.panel, border: `1px solid ${C.borderGold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20, position: "relative",
                }}>
                  <Icon style={{ width: 22, height: 22, color: C.gold }} />
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
            <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")} style={{ padding: "16px 36px", fontSize: 15 }}>
              Start Your Transaction Workflow
            </GoldBtn>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionLabel>Client Results</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 8px" }}>
            What Real Estate Teams <span style={{ color: C.gold, fontStyle: "italic" }}>Actually Say</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textSoft, maxWidth: 480, lineHeight: 1.75, marginBottom: 52, fontFamily: "Inter, sans-serif" }}>
            Real feedback from transaction coordinators, agents, and team leads who run their operations on EliteTC.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { quote: "The AI contract parsing alone cut my intake time by 80%. I upload the P&S and the transaction populates itself — deadlines, parties, commissions. I'm not manually entering anything anymore.", name: "Sarah M.", role: "Transaction Coordinator · NH", badge: "85+ transactions/year" },
              { quote: "The deadline engine catches things before they become problems. I get a notification 48 hours out, 24 hours out, and at the critical mark. Nothing falls through the cracks.", name: "James R.", role: "TC Lead · Greater Boston", badge: "200+ transactions/year" },
              { quote: "We rolled this out across our TC team and the compliance monitoring is exceptional. Missing initials, unsigned fields, overdue contingencies — all flagged automatically. Our error rate dropped immediately.", name: "Linda K.", role: "Broker/Owner · Southern NH", badge: "Regional Brokerage" },
              { quote: "Having all contacts, commissions, documents, and deadlines in one place — with full audit history — is exactly what modern TC operations need. This platform was built by people who actually understand the workflow.", name: "Marcus T.", role: "Independent TC · Seacoast NH", badge: "100+ transactions/year" },
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
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Common</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 24px" }}>Questions</h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.75, maxWidth: 260, marginBottom: 20, fontFamily: "Inter, sans-serif" }}>
              Everything you need to know before getting started with EliteTC.
            </p>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Don't see your question?</p>
            <button onClick={() => scrollTo("contact")} style={{ background: "none", border: "none", color: C.gold, fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", textDecoration: "underline", textDecorationColor: "rgba(210,163,95,0.4)" }}>
              Contact us directly
            </button>
          </div>

          <div>
            {[
              { q: "What types of contracts does EliteTC parse?",                  a: "The platform supports Purchase & Sale Agreements, listing agreements, buyer agency agreements, and addenda. Document recognition is automatic — the AI identifies the contract type before extraction." },
              { q: "How accurate is the AI contract parsing?",                     a: "Field extraction accuracy is high for standard NH contract forms. All parsed fields are reviewable and editable before the transaction is confirmed. Every extraction is logged for audit purposes." },
              { q: "What deadlines does the platform track?",                      a: "Inspection, financing contingency, appraisal, EMD, due diligence, clear-to-close target, and closing date are all tracked automatically. Overdue detection fires tiered alerts — notice (48h), warning (24h), urgent (12h), and critical (overdue)." },
              { q: "How does compliance monitoring work?",                         a: "10+ deterministic compliance rules evaluate each transaction continuously. Rules check for missing documents, unsigned fields, overdue contingencies, incomplete checklists, and risk conditions. Issues are surfaced immediately — no manual review required." },
              { q: "Is this built specifically for New Hampshire real estate?",     a: "Yes. The platform's workflow logic, compliance rules, and document parsing are calibrated for NH transaction requirements. That said, the core coordination capabilities are applicable to real estate operations in any market." },
              { q: "How does the contact management system work?",                 a: "Contacts are automatically imported from transaction records. Lenders, title companies, inspectors, attorneys, and agents are stored in a persistent CRM database, categorized by role, and reusable across every transaction." },
              { q: "Does the platform integrate with Google Calendar?",            a: "Yes. Transaction deadlines sync directly to Google Calendar via authorized OAuth integration. TCs and agents receive calendar events for every tracked milestone." },
              { q: "What roles and access levels are supported?",                  a: "The platform supports owner, admin, TC lead, TC, agent, and client roles — each with scoped access and visibility. Transactions are isolated by ownership, ensuring coordinators and clients only see what they're authorized to access." },
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

          <div>
            <SectionLabel>Get Started</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Ready to</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              Automate Your<br />TC Workflow?
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, maxWidth: 320, marginBottom: 36, fontFamily: "Inter, sans-serif" }}>
              Whether you're coordinating your first transaction or scaling a full TC operation, EliteTC gives you the infrastructure to manage every deal intelligently.
            </p>

            {[
              { icon: Mail,    text: "info@elitetc.com" },
              { icon: Phone,   text: "(800) 555-0192" },
              { icon: MapPin,  text: "Serving NH real estate professionals" },
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
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gold, margin: "0 0 3px", fontFamily: "Inter, sans-serif" }}>Onboarding within 24 hours</p>
                <p style={{ fontSize: 12, color: C.textMuted, margin: 0, fontFamily: "Inter, sans-serif" }}>All accounts are reviewed and configured by our team.</p>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 24px" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField label="FULL NAME *"     placeholder="Your full name" />
              <FormField label="EMAIL ADDRESS *" placeholder="your@email.com" type="email" />
              <FormField label="PHONE NUMBER"    placeholder="(555) 000-0000" type="tel" />
              <FormSelect label="I AM A" placeholder="Select your role" options={["Transaction Coordinator", "TC Lead", "Independent Agent", "Broker/Owner", "Real Estate Team"]} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <FormSelect label="PRIMARY NEED" placeholder="What matters most?" options={["AI Contract Parsing", "Deadline Tracking", "Compliance Monitoring", "Team TC Management", "Full Platform Access"]} fullWidth />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.textMuted, marginBottom: 7, fontFamily: "Inter, sans-serif" }}>MESSAGE</label>
              <textarea rows={4} placeholder="Tell us about your transaction volume, current workflow challenges, or any specific requirements..."
                style={{ width: "100%", background: "rgba(8,9,11,0.95)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 7, padding: "11px 13px", fontSize: 13, color: C.text, outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif", lineHeight: 1.65 }} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Coordinate Deals Smarter <ArrowRight style={{ width: 14, height: 14 }} />
              </GoldBtn>
              <OutlineBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Sign In
              </OutlineBtn>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ background: C.bgSoft, borderTop: `1px solid ${C.border}` }} className="px-5 md:px-16 pt-14 md:pt-16 pb-8">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-16 mb-12">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(210,163,95,0.12)", border: `1px solid ${C.borderGold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.gold }}>E</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'Playfair Display', serif", letterSpacing: "0.06em" }}>ELITETC</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase" }}>AI Transaction Platform</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.75, maxWidth: 240, marginBottom: 18, fontFamily: "Inter, sans-serif" }}>
                AI-powered transaction coordination for real estate professionals who demand operational precision at every stage of the deal.
              </p>
              <p style={{ fontSize: 13, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>info@elitetc.com</p>
              <p style={{ fontSize: 13, color: C.textSoft, marginTop: 4, fontFamily: "Inter, sans-serif" }}>(800) 555-0192</p>
            </div>

            {[
              { label: "Platform",    items: ["AI Contract Parsing", "Deadline Engine", "Compliance Tools", "Document Management", "Commission Tracking", "Contact CRM"] },
              { label: "Company",     items: ["Why EliteTC", "How It Works", "Testimonials", "FAQ"] },
              { label: "Get Started", items: ["Upload a Contract", "Schedule Consultation", "Contact Us", "TC Login"] },
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

// ─── Sub-components ──────────────────────────────────────────────────

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