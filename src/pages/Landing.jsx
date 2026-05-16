import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, Upload, Clock, ShieldCheck,
  Users, LayoutDashboard, CheckCircle2, Zap,
  FileText, DollarSign, CheckCircle,
  MessageSquare, Search, Star, FileCheck, Mail, Phone, MapPin,
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

  // ── NAV ─────────────────────────────────────────────────────────────
  const navLinks = ["Services", "Why EliteTC", "Process", "Testimonials", "FAQ", "Contact"];

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
            <SectionLabel>Premium Transaction Coordination</SectionLabel>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(58px, 7vw, 88px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              Close More.
            </h1>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(58px, 7vw, 88px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 36px", letterSpacing: "-0.01em" }}>
              Manage Less.
            </h1>

            <p style={{ fontSize: 16, color: C.textSoft, lineHeight: 1.75, maxWidth: 480, marginBottom: 32 }}>
              EliteTC handles every detail from contract to close — so you can focus on building relationships and growing your business. Precision coordination for agents, teams, and brokerages.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {["Contract-to-close coordination", "Compliance & deadline management", "Client & vendor communication"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft }}>
                  <CheckCircle style={{ width: 16, height: 16, color: C.gold, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 32 }}>
              <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Get Started <ArrowRight style={{ width: 15, height: 15 }} />
              </GoldBtn>
              <OutlineBtn onClick={() => scrollTo("contact")}>
                Schedule a Consultation
              </OutlineBtn>
            </div>

            <NavTextBtn onClick={() => scrollTo("services")}>
              View Services <ArrowRight style={{ width: 14, height: 14 }} />
            </NavTextBtn>
          </div>

          {/* RIGHT — Metrics card */}
          <div style={{
            background: "rgba(13,14,17,0.9)", backdropFilter: "blur(10px)",
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 18, padding: "36px 32px",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, marginBottom: 28, fontFamily: "Inter, sans-serif" }}>
              Performance Metrics
            </p>
            {[
              { label: "Transactions Closed", value: "500+" },
              { label: "On-Time Closings",    value: "98%" },
              { label: "Avg. Onboarding",     value: "72hr" },
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
              Trusted by independent agents, top-producing teams, and regional brokerages across the country.
            </p>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── THE ELITETC DIFFERENCE ───────────────────────────────────── */}
      <section id="why-elitetc" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          {/* Left */}
          <div>
            <SectionLabel>The EliteTC Difference</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.05, margin: "0 0 2px" }}>
              Your Transaction.
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 28px" }}>
              Our Responsibility.
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 36, maxWidth: 360, fontFamily: "Inter, sans-serif" }}>
              Transaction coordination isn't a support function — it's the operational backbone of a high-performing real estate practice. EliteTC treats every file with the same level of rigor, regardless of price point or complexity.
            </p>
            <div style={{
              background: "rgba(210,163,95,0.06)", border: `1px solid ${C.borderGold}`,
              borderRadius: 10, padding: "24px 26px",
            }}>
              <p style={{ fontSize: 14, color: C.textSoft, fontStyle: "italic", lineHeight: 1.75, margin: 0, fontFamily: "'Playfair Display', serif" }}>
                "The best agents in the country don't manage their own transactions. They build systems that do it for them."
              </p>
            </div>
          </div>

          {/* Right — 3 feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: ShieldCheck, title: "Stay Compliant", desc: "Every document reviewed. Every requirement met. Zero compliance surprises at closing." },
              { icon: FileText,    title: "Stay Organized", desc: "One coordinator, one system, complete visibility. Your transaction file is always current and accessible." },
              { icon: Users,       title: "Stay Client-Focused", desc: "When operations are handled, your attention goes where it belongs — on your clients and your next deal." },
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
              Full-Spectrum <span style={{ color: C.gold, fontStyle: "italic" }}>Transaction</span>
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.05, margin: "0 0 24px" }}>
              Services
            </h2>
            <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 580, lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
              From the moment a contract is executed to the day keys are handed over, EliteTC manages every operational detail — so your attention stays on clients.
            </p>
          </div>

          {/* Row 1: 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ServiceCard icon={FileText}      title="Contract-to-Close Coordination" desc="Full oversight from executed contract through final closing. Every document, every deadline, every party — managed with precision." />
            <ServiceCard icon={ShieldCheck}   title="Compliance Management"          desc="We ensure every transaction meets state, brokerage, and MLS compliance requirements. No gaps, no surprises." />
            <ServiceCard icon={Clock}         title="Deadline Tracking"              desc="Inspection periods, financing contingencies, closing dates — tracked and communicated proactively so nothing slips." />
          </div>
          {/* Row 2: 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ServiceCard icon={MessageSquare} title="Communication Management"       desc="Coordinated communication between agents, clients, lenders, title, and escrow. One point of contact for all parties." />
            <ServiceCard icon={LayoutDashboard} title="MLS Input Support"             desc="Accurate, timely MLS data entry and status updates. We handle the administrative load so your listings stay current." />
            <ServiceCard icon={Search}        title="Document Review"                desc="Thorough review of all transaction documents for completeness, accuracy, and compliance before submission." />
            <ServiceCard icon={Users}         title="Client & Vendor Coordination"   desc="We manage relationships with inspectors, appraisers, lenders, title companies, and all parties involved in the transaction." />
          </div>
          {/* Row 3: 1 col (partial) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ServiceCard icon={DollarSign}    title="Commission & Closing Tracking"  desc="Accurate commission tracking, closing cost coordination, and final disbursement oversight for every transaction." />
          </div>
        </div>
      </section>

      {/* ── DIVIDER ─── */}
      <div style={{ height: 1, background: C.border, maxWidth: 1100, margin: "0 auto" }} />

      {/* ── WHY ELITETC ─────────────────────────────────────────────── */}
      <section id="why-elitetc" style={{ background: C.bg }} className="py-16 md:py-28 px-5 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-12 md:gap-24" style={{ maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

          {/* Left */}
          <div>
            <SectionLabel>Why EliteTC</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Built for</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              Agents Who<br />Perform
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, marginBottom: 32, fontFamily: "Inter, sans-serif" }}>
              Top-producing agents don't spend their time on paperwork. They work with systems and teams that handle operations at a professional level.
            </p>
            <div style={{ height: 1, background: C.border, marginBottom: 28 }} />
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "22px 24px",
            }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: C.gold, margin: "0 0 6px", fontStyle: "italic" }}>15+</p>
              <p style={{ fontSize: 13, color: C.textSoft, margin: 0, fontFamily: "Inter, sans-serif" }}>Hours saved per transaction on average</p>
            </div>
          </div>

          {/* Right — 2×3 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <WhyCard num="01" icon={Zap}           title="Faster Transactions"            desc="Streamlined processes and proactive coordination reduce delays at every stage. Our team anticipates bottlenecks before they become problems." />
            <WhyCard num="02" icon={Clock}          title="Reduced Admin Workload"          desc="Eliminate the hours spent on paperwork, follow-ups, and scheduling. EliteTC absorbs the operational load so you can focus on revenue-generating activities." />
            <WhyCard num="03" icon={Star}           title="Better Client Experience"        desc="Clients receive timely updates, clear communication, and a seamless experience from offer acceptance through closing day." />
            <WhyCard num="04" icon={MessageSquare}  title="Organized Communication"         desc="All parties — buyers, sellers, lenders, title, inspectors — stay informed and aligned. No missed messages, no communication gaps." />
            <WhyCard num="05" icon={ShieldCheck}    title="Deadline Accountability"         desc="Every contingency, inspection period, and closing date is tracked and enforced. We hold all parties accountable so your deals don't fall apart." />
            <WhyCard num="06" icon={CheckCircle2}   title="Professional Transaction Oversight" desc="Experienced coordinators who understand real estate compliance, documentation standards, and the nuances of complex transactions." />
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
            From Contract to Close,
          </h2>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 24px" }}>
            Handled.
          </h2>
          <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 520, margin: "0 auto 72px", lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
            A structured, repeatable process that delivers consistent results on every transaction.
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
              { num: "1", icon: Upload,       title: "Upload Your Contract",      desc: "Submit your executed contract through our secure portal. We accept all standard forms and addenda." },
              { num: "2", icon: FileCheck,     title: "Review & Processing",       desc: "EliteTC reviews all documents for completeness, compliance, and accuracy. We identify missing items and request them immediately." },
              { num: "3", icon: Clock,         title: "Deadlines & Tasks Managed", desc: "A complete timeline is built for your transaction. Every contingency, inspection, and closing date is tracked and enforced." },
              { num: "4", icon: Users,         title: "All Parties Coordinated",   desc: "We communicate with buyers, sellers, lenders, title, inspectors, and all vendors. You receive status updates, not action items." },
              { num: "5", icon: CheckCircle2,  title: "Transaction Closed",        desc: "Final documents verified, commission tracked, and closing confirmed. Your transaction is complete — on time and in compliance." },
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
            <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")} style={{ padding: "16px 36px", fontSize: 15 }}>
              Start Your First Transaction
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
            What Agents <span style={{ color: C.gold, fontStyle: "italic" }}>Actually Say</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textSoft, maxWidth: 440, lineHeight: 1.75, marginBottom: 52, fontFamily: "Inter, sans-serif" }}>
            Real feedback from agents, teams, and brokerages who rely on EliteTC to run their operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { quote: "EliteTC has completely changed how I operate. I used to spend 3–4 hours per transaction on admin work. Now I hand it off and focus on my clients. My volume is up 40% this year.", name: "Sarah M.", role: "Independent Agent · Dallas, TX", badge: "85+ transactions/year" },
              { quote: "The compliance management alone is worth every penny. I've never had a file come back with issues since working with EliteTC. Their attention to detail is exceptional.", name: "James R.", role: "Team Lead · Phoenix, AZ", badge: "200+ transactions/year" },
              { quote: "Our brokerage onboarded EliteTC for our top 20 agents. The operational improvement was immediate. Deadlines are never missed, clients are always informed.", name: "Linda K.", role: "Broker/Owner · Nashville, TN", badge: "Regional Brokerage" },
              { quote: "I was skeptical — I thought no one could manage my transactions better than me. I was wrong. EliteTC is thorough, professional, and genuinely invested in every deal.", name: "Marcus T.", role: "Top Producer · Austin, TX", badge: "100+ transactions/year" },
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
              { q: "What types of transactions does EliteTC coordinate?",         a: "We coordinate residential, commercial, and multi-family transactions including buyer-side, listing-side, and dual agency. We work with all standard contract forms across states." },
              { q: "How do I submit a transaction to EliteTC?",                   a: "Simply start a transaction through our secure intake portal. Upload your executed contract and we'll take it from there within one business day." },
              { q: "Do you work with individual agents, teams, or brokerages?",   a: "All three. Whether you're a solo agent, a top-producing team, or a regional brokerage, we build a coordination workflow that fits your operation." },
              { q: "How does EliteTC handle compliance requirements?",             a: "We review every document for completeness, accuracy, and compliance with state, brokerage, and MLS requirements. Any missing items are flagged and requested immediately." },
              { q: "What is your communication process with clients and vendors?", a: "We serve as the central point of contact for all parties. You receive regular status updates without needing to manage communication yourself." },
              { q: "How are your services priced?",                               a: "Our pricing is per-transaction with no long-term commitments or setup fees. Contact us for current rates based on your transaction volume." },
              { q: "What happens if a transaction falls through?",                a: "We only charge for transactions that successfully proceed. If a deal falls through, you won't be billed for coordination work on that file." },
              { q: "Can EliteTC work with my existing transaction management software?", a: "Yes. We are experienced with most major platforms. Our coordinators adapt to your existing systems and workflows." },
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
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.text, lineHeight: 1.0, margin: "0 0 2px" }}>Ready to</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, color: C.gold, fontStyle: "italic", lineHeight: 1.0, margin: "0 0 28px" }}>
              Elevate Your<br />Operations?
            </h2>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.8, maxWidth: 320, marginBottom: 36, fontFamily: "Inter, sans-serif" }}>
              Whether you're starting your first transaction or looking to scale your operation, EliteTC is ready to handle the details.
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
              <GoldBtn onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Start a Transaction <ArrowRight style={{ width: 14, height: 14 }} />
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
                Premium transaction coordination for real estate professionals who demand operational excellence.
              </p>
              <p style={{ fontSize: 13, color: C.textSoft, fontFamily: "Inter, sans-serif" }}>info@elitetc.com</p>
              <p style={{ fontSize: 13, color: C.textSoft, marginTop: 4, fontFamily: "Inter, sans-serif" }}>(800) 555-0192</p>
            </div>

            {[
              { label: "Services",    items: ["Contract-to-Close", "Compliance Mgmt", "Deadline Tracking", "Communication", "MLS Input Support", "Document Review"] },
              { label: "Company",     items: ["Why EliteTC", "Our Process", "Testimonials", "FAQ"] },
              { label: "Get Started", items: ["Start a Transaction", "Schedule Consultation", "Contact Us", "TC Login"] },
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