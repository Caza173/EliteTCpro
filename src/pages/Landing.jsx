import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, Upload, Clock, ShieldCheck, Send,
  Users, LayoutDashboard, CheckCircle2, Zap,
  FileText, Lock, CircleCheck, TrendingUp, DollarSign,
  MessageSquare, Search, Star,
} from "lucide-react";

const GOLD = "#d2a35f";
const GOLD_SOFT = "#c99655";
const BG = "#050506";
const PANEL = "#0d0e11";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_GOLD = "rgba(210,163,95,0.22)";
const TEXT = "#f5f1e8";
const TEXT_SOFT = "#a6adbb";
const TEXT_MUTED = "#6f7683";

const SectionLabel = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
    <div style={{ width: 28, height: 1, background: GOLD, opacity: 0.7 }} />
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD }}>
      {children}
    </span>
  </div>
);

const GoldButton = ({ children, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "12px 24px",
      background: GOLD, color: "#050506",
      border: "none", borderRadius: 8,
      fontSize: 14, fontWeight: 700,
      cursor: "pointer",
      transition: "background 0.2s ease",
      ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#e0b874"}
    onMouseLeave={e => e.currentTarget.style.background = GOLD}
  >
    {children}
  </button>
);

const OutlineButton = ({ children, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "12px 24px",
      background: "transparent", color: TEXT,
      border: `1px solid rgba(255,255,255,0.18)`, borderRadius: 8,
      fontSize: 14, fontWeight: 600,
      cursor: "pointer",
      transition: "border-color 0.2s ease, background 0.2s ease",
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_GOLD; e.currentTarget.style.background = "rgba(210,163,95,0.07)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.background = "transparent"; }}
  >
    {children}
  </button>
);

export default function Landing() {
  const navigate = useNavigate();
  const [brokerageLogo, setBrokerageLogo] = useState(null);

  useEffect(() => {
    base44.entities.Brokerage.list().then((results) => {
      const logo = results?.[0]?.branding_logo;
      if (logo) setBrokerageLogo(logo);
    }).catch(() => {});
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 64,
        background: "rgba(5,5,6,0.95)",
        borderBottom: `1px solid ${BORDER}`,
        backdropFilter: "blur(12px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: "rgba(210,163,95,0.15)",
            border: `1px solid ${BORDER_GOLD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: GOLD,
          }}>E</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display', serif", letterSpacing: "0.04em" }}>ELITETC</div>
            <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: "0.12em", color: TEXT_MUTED, textTransform: "uppercase" }}>Transaction Coordination</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="hidden md:flex">
          {["Services", "Why EliteTC", "Process", "Testimonials", "FAQ", "Contact"].map(item => (
            <button key={item}
              onClick={() => scrollTo(item.toLowerCase().replace(" ", "-"))}
              style={{ background: "none", border: "none", fontSize: 13, color: TEXT_SOFT, cursor: "pointer", padding: 0, transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = TEXT}
              onMouseLeave={e => e.currentTarget.style.color = TEXT_SOFT}
            >{item}</button>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OutlineButton onClick={() => base44.auth.redirectToLogin("/Dashboard")} style={{ padding: "8px 16px", fontSize: 13 }}>
            Schedule Consultation
          </OutlineButton>
          <GoldButton onClick={() => navigate("/AgentIntake?agent=1")} style={{ padding: "8px 18px", fontSize: 13 }}>
            Start a Transaction
          </GoldButton>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "90vh", display: "flex", alignItems: "center",
        padding: "80px 48px", position: "relative", overflow: "hidden",
      }}>
        {/* Subtle diagonal texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "repeating-linear-gradient(135deg, rgba(210,163,95,0.5) 0px, rgba(210,163,95,0.5) 1px, transparent 1px, transparent 80px)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 380px", gap: 80, alignItems: "center" }}>
          {/* Left */}
          <div>
            <SectionLabel>Premium Transaction Coordination</SectionLabel>

            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(52px, 6vw, 84px)",
              fontWeight: 800,
              color: TEXT,
              lineHeight: 1.05,
              margin: "0 0 12px",
            }}>
              Close More.
            </h1>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(52px, 6vw, 84px)",
              fontWeight: 800,
              color: GOLD,
              fontStyle: "italic",
              lineHeight: 1.05,
              margin: "0 0 32px",
            }}>
              Manage Less.
            </h1>

            <p style={{ fontSize: 17, color: TEXT_SOFT, lineHeight: 1.7, maxWidth: 480, marginBottom: 28 }}>
              EliteTC handles every detail from contract to close — so you can focus on building relationships and growing your business. Precision coordination for agents, teams, and brokerages.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
              {["Contract-to-close coordination", "Compliance & deadline management", "Client & vendor communication"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: TEXT_SOFT }}>
                  <CircleCheck style={{ width: 15, height: 15, color: GOLD, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 28 }}>
              <GoldButton onClick={() => navigate("/AgentIntake?agent=1")}>
                Start a Transaction <ArrowRight style={{ width: 15, height: 15 }} />
              </GoldButton>
              <OutlineButton onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Schedule a Consultation
              </OutlineButton>
            </div>

            <button
              onClick={() => scrollTo("services")}
              style={{ background: "none", border: "none", color: GOLD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              View Services <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Right — Metrics panel */}
          <div style={{
            background: PANEL,
            border: `1px solid ${BORDER_GOLD}`,
            borderRadius: 16,
            padding: "32px 28px",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, marginBottom: 24 }}>
              Performance Metrics
            </p>
            {[
              { label: "Transactions Closed", value: "500+" },
              { label: "On-Time Closings",    value: "98%" },
              { label: "Avg. Onboarding",     value: "72hr" },
            ].map(({ label, value }, i) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0" }}>
                  <span style={{ fontSize: 14, color: TEXT_SOFT }}>{label}</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: GOLD }}>{value}</span>
                </div>
                {i < 2 && <div style={{ height: 1, background: BORDER }} />}
              </div>
            ))}
            <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 20, lineHeight: 1.6 }}>
              Trusted by independent agents, top-producing teams, and regional brokerages across the country.
            </p>
          </div>
        </div>
      </section>

      {/* ── THE ELITETC DIFFERENCE ── */}
      <section id="why-elitetc" style={{ padding: "100px 48px", background: "#08090b" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          {/* Left */}
          <div>
            <SectionLabel>The EliteTC Difference</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>
              Your Transaction.
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 24 }}>
              Our Responsibility.
            </h2>
            <p style={{ fontSize: 15, color: TEXT_SOFT, lineHeight: 1.75, marginBottom: 32, maxWidth: 400 }}>
              Transaction coordination isn't a support function — it's the operational backbone of a high-performing real estate practice. EliteTC treats every file with the same level of rigor, regardless of price point or complexity.
            </p>
            <div style={{
              background: "rgba(210,163,95,0.06)",
              border: `1px solid ${BORDER_GOLD}`,
              borderRadius: 12,
              padding: "24px 28px",
            }}>
              <p style={{ fontSize: 15, color: TEXT_SOFT, fontStyle: "italic", lineHeight: 1.75, margin: 0 }}>
                "The best agents in the country don't manage their own transactions. They build systems that do it for them."
              </p>
            </div>
          </div>

          {/* Right — Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: ShieldCheck, title: "Stay Compliant", desc: "Every document reviewed. Every requirement met. Zero compliance surprises at closing." },
              { icon: LayoutDashboard, title: "Stay Organized", desc: "One coordinator, one system, complete visibility. Your transaction file is always current and accessible." },
              { icon: Users, title: "Stay Client-Focused", desc: "When operations are handled, your attention goes where it belongs — on your clients and your next deal." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                display: "flex", gap: 18, alignItems: "flex-start",
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px 22px",
                transition: "border-color 0.2s ease",
                cursor: "default",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER_GOLD}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: "rgba(210,163,95,0.1)",
                  border: `1px solid rgba(210,163,95,0.2)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: GOLD, flexShrink: 0,
                }}>
                  <Icon style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{title}</p>
                  <p style={{ fontSize: 13, color: TEXT_SOFT, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: "100px 48px", background: BG }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>
              Full-Spectrum <span style={{ color: GOLD, fontStyle: "italic" }}>Transaction</span>
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 20 }}>
              Services
            </h2>
            <p style={{ fontSize: 15, color: TEXT_SOFT, maxWidth: 560, lineHeight: 1.7 }}>
              From the moment a contract is executed to the day keys are handed over, EliteTC manages every operational detail — so your attention stays on clients.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { icon: FileText,      title: "Contract-to-Close Coordination",  desc: "Full oversight from executed contract through final closing. Every document, every deadline, every party — managed with precision." },
              { icon: ShieldCheck,   title: "Compliance Management",           desc: "We ensure every transaction meets state, brokerage, and MLS compliance requirements. No gaps, no surprises." },
              { icon: Clock,         title: "Deadline Tracking",               desc: "Inspection periods, financing contingencies, closing dates — tracked and communicated proactively so nothing slips." },
              { icon: MessageSquare, title: "Communication Management",        desc: "Coordinated communication between agents, clients, lenders, title, and escrow. One point of contact for all parties." },
              { icon: Search,        title: "MLS Input Support",               desc: "Accurate, timely MLS data entry and status updates. We handle the administrative load so your listings stay current." },
              { icon: FileText,      title: "Document Review",                 desc: "Thorough review of all transaction documents for completeness, accuracy, and compliance before submission." },
              { icon: Users,         title: "Client & Vendor Coordination",    desc: "We manage relationships with inspectors, appraisers, lenders, title companies, and all parties involved in the transaction." },
              { icon: DollarSign,    title: "Commission & Closing Tracking",   desc: "Accurate commission tracking, closing cost coordination, and final disbursement oversight for every transaction." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "28px 24px",
                display: "flex", flexDirection: "column", gap: 14,
                transition: "border-color 0.2s ease",
                cursor: "default",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER_GOLD}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: "rgba(210,163,95,0.1)",
                  border: "1px solid rgba(210,163,95,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: GOLD,
                }}>
                  <Icon style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8, lineHeight: 1.3 }}>{title}</p>
                  <p style={{ fontSize: 13, color: TEXT_SOFT, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ELITETC ── */}
      <section id="why" style={{ padding: "100px 48px", background: "#08090b" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 80, alignItems: "start" }}>
          {/* Left */}
          <div>
            <SectionLabel>Why EliteTC</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>
              Built for
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 24 }}>
              Agents Who<br />Perform
            </h2>
            <p style={{ fontSize: 14, color: TEXT_SOFT, lineHeight: 1.75, marginBottom: 32, maxWidth: 300 }}>
              Top-producing agents don't spend their time on paperwork. They work with systems and teams that handle operations at a professional level.
            </p>
            <div style={{
              background: "rgba(210,163,95,0.06)",
              border: `1px solid ${BORDER_GOLD}`,
              borderRadius: 12,
              padding: "24px",
            }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: GOLD, margin: "0 0 6px" }}>15+</p>
              <p style={{ fontSize: 13, color: TEXT_SOFT, margin: 0 }}>Hours saved per transaction on average</p>
            </div>
          </div>

          {/* Right — Benefits grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { num: "01", icon: Zap,           title: "Faster Transactions",           desc: "Streamlined processes and proactive coordination reduce delays at every stage." },
              { num: "02", icon: Clock,          title: "Reduced Admin Workload",        desc: "Eliminate hours spent on paperwork, follow-ups, and scheduling." },
              { num: "03", icon: Star,           title: "Better Client Experience",      desc: "Clients receive timely updates, clear communication, and a seamless experience." },
              { num: "04", icon: MessageSquare,  title: "Organized Communication",       desc: "All parties stay informed and aligned. No missed messages, no gaps." },
              { num: "05", icon: ShieldCheck,    title: "Deadline Accountability",       desc: "Every contingency and closing date is tracked and enforced without exception." },
              { num: "06", icon: CheckCircle2,   title: "Professional Oversight",        desc: "Experienced coordinators who understand real estate compliance and documentation standards." },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
                transition: "border-color 0.2s ease",
                cursor: "default",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER_GOLD}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7,
                    background: "rgba(210,163,95,0.1)", border: "1px solid rgba(210,163,95,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: GOLD,
                  }}>
                    <Icon style={{ width: 14, height: 14 }} />
                  </div>
                  <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>{num}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 12, color: TEXT_SOFT, lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="process" style={{ padding: "100px 48px", background: BG }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <SectionLabel>How It Works</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>
            From Contract to Close,
          </h2>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 16 }}>
            Handled.
          </h2>
          <p style={{ fontSize: 15, color: TEXT_SOFT, maxWidth: 480, margin: "0 auto 64px", lineHeight: 1.7 }}>
            A structured, repeatable process that delivers consistent results on every transaction.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>
            {[
              { num: "1", icon: Upload,         title: "Upload Your Contract",     desc: "Submit your executed contract through our secure portal. We accept all standard forms and addenda." },
              { num: "2", icon: FileText,        title: "Review & Processing",      desc: "EliteTC reviews all documents for completeness, compliance, and accuracy. We identify missing items immediately." },
              { num: "3", icon: Clock,           title: "Deadlines & Tasks Managed",desc: "A complete timeline is built for your transaction. Every contingency, inspection, and closing date is tracked." },
              { num: "4", icon: Users,           title: "All Parties Coordinated",  desc: "We communicate with buyers, sellers, lenders, title, inspectors, and all vendors on your behalf." },
              { num: "5", icon: CheckCircle2,    title: "Transaction Closed",       desc: "Final documents verified, commission tracked, and closing confirmed. Your transaction is complete and in compliance." },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} style={{ textAlign: "center" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(210,163,95,0.1)",
                  border: `1px solid ${BORDER_GOLD}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", position: "relative",
                }}>
                  <Icon style={{ width: 22, height: 22, color: GOLD }} />
                  <div style={{
                    position: "absolute", top: -8, right: -8,
                    width: 20, height: 20, borderRadius: "50%",
                    background: GOLD, color: "#050506",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{num}</div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 12, color: TEXT_SOFT, lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "100px 48px", background: "#08090b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionLabel>Client Results</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: TEXT, marginBottom: 8, lineHeight: 1.1 }}>
            What Agents <span style={{ color: GOLD, fontStyle: "italic" }}>Actually Say</span>
          </h2>
          <p style={{ fontSize: 14, color: TEXT_SOFT, maxWidth: 440, lineHeight: 1.7, marginBottom: 48 }}>
            Real feedback from agents, teams, and brokerages who rely on EliteTC to run their operations.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { quote: "EliteTC has completely changed how I operate. I used to spend 3-4 hours per transaction on admin work. Now I hand it off and focus on my clients. My volume is up 40% this year.", name: "Sarah M.", role: "Independent Agent · Dallas, TX", badge: "85+ transactions/year" },
              { quote: "The compliance management alone is worth every penny. I've never had a file come back with issues since working with EliteTC. Their attention to detail is exceptional.", name: "James R.", role: "Team Lead · Phoenix, AZ", badge: "200+ transactions/year" },
              { quote: "Our brokerage onboarded EliteTC for our top 20 agents. The operational improvement was immediate. Deadlines are never missed, clients are always informed, and our agents are happier.", name: "Linda K.", role: "Broker/Owner · Nashville, TN", badge: "Regional Brokerage" },
              { quote: "I was skeptical at first — I thought no one could manage my transactions better than me. I was wrong. EliteTC is thorough, professional, and genuinely invested in every deal.", name: "Marcus T.", role: "Top Producer · Austin, TX", badge: "100+ transactions/year" },
            ].map(({ quote, name, role, badge }) => (
              <div key={name} style={{
                background: PANEL, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: "28px",
              }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} style={{ width: 13, height: 13, color: GOLD, fill: GOLD }} />)}
                </div>
                <p style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.06em", color: GOLD, marginBottom: 6 }}>"</p>
                <p style={{ fontSize: 14, color: TEXT_SOFT, fontStyle: "italic", lineHeight: 1.75, marginBottom: 20 }}>{quote}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{name}</p>
                    <p style={{ fontSize: 11, color: TEXT_MUTED }}>{role}</p>
                  </div>
                  <div style={{
                    fontSize: 11, color: TEXT_MUTED, padding: "4px 10px",
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                  }}>{badge}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: "80px 48px", background: BG, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: TEXT, lineHeight: 1.1, margin: "0 0 8px" }}>
              Your next transaction starts
            </h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, margin: "0 0 16px" }}>
              today.
            </h2>
            <p style={{ fontSize: 14, color: TEXT_SOFT, margin: 0 }}>
              No long-term contracts. No setup fees. Just professional coordination from day one.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <GoldButton onClick={() => navigate("/AgentIntake?agent=1")}>
              Start a Transaction <ArrowRight style={{ width: 15, height: 15 }} />
            </GoldButton>
            <OutlineButton onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
              Schedule a Consultation
            </OutlineButton>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "100px 48px", background: "#08090b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 80, alignItems: "start" }}>
          <div>
            <SectionLabel>FAQ</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>Common</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 20 }}>Questions</h2>
            <p style={{ fontSize: 14, color: TEXT_SOFT, lineHeight: 1.7, marginBottom: 16, maxWidth: 280 }}>
              Everything you need to know before getting started with EliteTC.
            </p>
            <p style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 6 }}>Don't see your question?</p>
            <button
              onClick={() => scrollTo("contact")}
              style={{ background: "none", border: "none", color: GOLD, fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline", textDecorationColor: "rgba(210,163,95,0.4)" }}
            >
              Contact us directly
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              "What types of transactions does EliteTC coordinate?",
              "How do I submit a transaction to EliteTC?",
              "Do you work with individual agents, teams, or brokerages?",
              "How does EliteTC handle compliance requirements?",
              "What is your communication process with clients and vendors?",
              "How are your services priced?",
              "What happens if a transaction falls through?",
              "Can EliteTC work with my existing transaction management software?",
            ].map((q) => (
              <div key={q} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.querySelector("span").style.color = TEXT}
                onMouseLeave={e => { if (e.currentTarget.querySelector("span")) e.currentTarget.querySelector("span").style.color = TEXT_SOFT; }}
              >
                <span style={{ fontSize: 14, color: TEXT_SOFT, transition: "color 0.15s", paddingRight: 16 }}>{q}</span>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center",
                  color: TEXT_MUTED, fontSize: 14, fontWeight: 300,
                }}>+</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: "100px 48px", background: BG }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "start" }}>
          <div>
            <SectionLabel>Get Started</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: TEXT, lineHeight: 1.1, marginBottom: 8 }}>Ready to</h2>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 800, color: GOLD, fontStyle: "italic", lineHeight: 1.1, marginBottom: 24 }}>
              Elevate Your<br />Operations?
            </h2>
            <p style={{ fontSize: 14, color: TEXT_SOFT, lineHeight: 1.75, maxWidth: 320, marginBottom: 32 }}>
              Whether you're starting your first transaction or looking to scale your operation, EliteTC is ready to handle the details.
            </p>

            {[
              { label: "nhcazateam@gmail.com" },
              { label: "(800) 555-0192" },
              { label: "Serving agents nationwide" },
            ].map(({ label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(210,163,95,0.1)", border: `1px solid ${BORDER_GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
                </div>
                <span style={{ fontSize: 13, color: TEXT_SOFT }}>{label}</span>
              </div>
            ))}

            <div style={{
              marginTop: 24,
              background: "rgba(210,163,95,0.06)",
              border: `1px solid ${BORDER_GOLD}`,
              borderRadius: 10,
              padding: "16px 18px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0, marginTop: 4 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: "0 0 3px" }}>Response within 1 business day</p>
                <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>All inquiries are reviewed by a senior coordinator.</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "36px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {[
                { label: "FULL NAME *", placeholder: "Your full name" },
                { label: "EMAIL ADDRESS *", placeholder: "your@email.com" },
                { label: "PHONE NUMBER", placeholder: "(555) 000-0000" },
                { label: "I AM A", placeholder: "Select your role", type: "select", options: ["Independent Agent", "Team Lead", "Broker/Owner", "Transaction Coordinator"] },
              ].map(({ label, placeholder, type, options }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 6 }}>{label}</label>
                  {type === "select" ? (
                    <select style={{ width: "100%", background: "rgba(8,9,11,0.9)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: TEXT_SOFT, outline: "none" }}>
                      <option value="">{placeholder}</option>
                      {options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input placeholder={placeholder} style={{ width: "100%", background: "rgba(8,9,11,0.9)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: TEXT, outline: "none" }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 6 }}>SERVICE NEEDED</label>
              <select style={{ width: "100%", background: "rgba(8,9,11,0.9)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: TEXT_SOFT, outline: "none" }}>
                <option value="">Select a service</option>
                <option>Contract-to-Close Coordination</option>
                <option>Compliance Management</option>
                <option>Full Transaction Management</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 6 }}>MESSAGE</label>
              <textarea rows={4} placeholder="Tell us about your transaction volume, current challenges, or any specific needs..." style={{ width: "100%", background: "rgba(8,9,11,0.9)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: TEXT, outline: "none", resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <GoldButton onClick={() => navigate("/AgentIntake?agent=1")}>
                Start a Transaction <ArrowRight style={{ width: 14, height: 14 }} />
              </GoldButton>
              <OutlineButton onClick={() => base44.auth.redirectToLogin("/Dashboard")}>
                Schedule a Consultation
              </OutlineButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="footer" style={{ background: "#08090b", borderTop: `1px solid ${BORDER}`, padding: "60px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 60, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(210,163,95,0.15)", border: `1px solid ${BORDER_GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: GOLD }}>E</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display', serif", letterSpacing: "0.04em" }}>ELITETC</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.1em", color: TEXT_MUTED, textTransform: "uppercase" }}>Transaction Coordination</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.75, maxWidth: 240, marginBottom: 16 }}>
                Premium transaction coordination for real estate professionals who demand operational excellence. From contract to close — handled.
              </p>
              <p style={{ fontSize: 13, color: TEXT_SOFT }}>nhcazateam@gmail.com</p>
              <p style={{ fontSize: 13, color: TEXT_SOFT, marginTop: 4 }}>(800) 555-0192</p>
            </div>

            {/* Services */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, marginBottom: 20 }}>Services</p>
              {["Contract-to-Close", "Compliance Management", "Deadline Tracking", "Communication Mgmt", "MLS Input Support", "Document Review"].map(l => (
                <p key={l} style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10 }}>{l}</p>
              ))}
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, marginBottom: 20 }}>Company</p>
              {["Why EliteTC", "Our Process", "Testimonials", "FAQ"].map(l => (
                <p key={l} style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10, cursor: "pointer" }}>{l}</p>
              ))}
            </div>

            {/* Get Started */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, marginBottom: 20 }}>Get Started</p>
              {["Start a Transaction", "Schedule Consultation", "Contact Us"].map(l => (
                <p key={l} style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10, cursor: "pointer" }}>{l}</p>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 12, color: TEXT_MUTED }}>© 2026 EliteTC. All rights reserved.</p>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>Privacy Policy</span>
              <span style={{ fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}