import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { tutorialSections, faqSections } from "@/lib/helpContent";
import { Plus, Bot, ChevronDown, ChevronRight, Terminal, BookOpen, HelpCircle, Zap } from "lucide-react";

const CYAN = "#00F5FF";

// ── Left Rail Nav Item ──────────────────────────────────────────────────────
function NavItem({ section, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded transition-all text-xs font-mono group"
      style={{
        color: isActive ? CYAN : "#94A3B8",
        background: isActive ? "rgba(0,245,255,0.07)" : "transparent",
        borderLeft: isActive ? `2px solid ${CYAN}` : "2px solid transparent",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
        style={{ background: isActive ? CYAN : "#334155", boxShadow: isActive ? `0 0 6px ${CYAN}` : "none" }}
      />
      <span className="truncate uppercase tracking-wide text-[10px]">
        {section.icon} {section.title}
      </span>
    </button>
  );
}

// ── Glass Card ──────────────────────────────────────────────────────────────
function GlassCard({ children, className = "", glowColor = CYAN }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        background: "rgba(15,23,42,0.7)",
        borderColor: "rgba(0,245,255,0.15)",
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 0 1px rgba(0,245,255,0.08), 0 4px 24px rgba(0,0,0,0.4)`,
      }}
    >
      {children}
    </div>
  );
}

// ── Tutorial Section ────────────────────────────────────────────────────────
function TutorialSection({ section }) {
  const [openSteps, setOpenSteps] = useState([0]);
  const toggle = (i) =>
    setOpenSteps((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  return (
    <GlassCard id={section.id} className="overflow-hidden">
      {/* Section header */}
      <div
        className="px-5 py-3 border-b flex items-center gap-3"
        style={{ borderColor: "rgba(0,245,255,0.1)", background: "rgba(0,245,255,0.04)" }}
      >
        <span className="text-base">{section.icon}</span>
        <div>
          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: CYAN }}>
            &lt;{section.id.toUpperCase().replace(/-/g, "_")}&gt;
          </p>
          <h2 className="text-sm font-semibold text-white">{section.title}</h2>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y" style={{ borderColor: "rgba(0,245,255,0.06)" }}>
        {section.steps.map((step, i) => {
          const isOpen = openSteps.includes(i);
          return (
            <div key={i}>
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                    style={{ background: "rgba(0,245,255,0.12)", color: CYAN, border: `1px solid rgba(0,245,255,0.3)` }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-slate-200">{step.title}</span>
                </div>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CYAN }} />
                  : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                }
              </button>

              {isOpen && (
                <div className="px-5 pb-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <ul className="space-y-2 mt-1">
                    {step.content.map((line, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="flex-shrink-0 mt-0.5 font-mono" style={{ color: CYAN }}>›</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ── FAQ Section ─────────────────────────────────────────────────────────────
function FAQSection({ section }) {
  const [openItems, setOpenItems] = useState([]);
  const toggle = (i) =>
    setOpenItems((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  return (
    <GlassCard className="overflow-hidden">
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "rgba(0,245,255,0.1)", background: "rgba(0,245,255,0.04)" }}
      >
        <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: CYAN }}>
          // {section.title}
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(0,245,255,0.06)" }}>
        {section.items.map((item, i) => {
          const isOpen = openItems.includes(i);
          return (
            <div key={i}>
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="text-sm text-slate-200 font-medium pr-4">{item.question}</span>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CYAN }} />
                  : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                }
              </button>
              {isOpen && (
                <div className="px-5 pb-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function TutorialFAQPage() {
  const [activeTab, setActiveTab] = useState("tutorial");
  const [activeSectionId, setActiveSectionId] = useState(tutorialSections[0].id);

  const scrollToSection = (id) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="min-h-screen -m-4 lg:-m-5 p-0"
      style={{ background: "#0A0F1E" }}
    >
      {/* Top header bar */}
      <div
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: "rgba(0,245,255,0.12)", background: "rgba(2,6,23,0.9)" }}
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4" style={{ color: CYAN }} />
          <span className="text-xs font-mono text-slate-400 tracking-widest uppercase">EliteTC</span>
          <span className="text-slate-600 font-mono text-xs">/</span>
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: CYAN }}>Help_Center</span>
        </div>

      </div>

      <div className="flex h-[calc(100vh-112px)]">
        {/* Left Rail */}
        <aside
          className="w-52 flex-shrink-0 border-r flex flex-col overflow-y-auto hidden lg:flex"
          style={{ borderColor: "rgba(0,245,255,0.1)", background: "rgba(2,6,23,0.6)" }}
        >
          {/* Tab switcher */}
          <div className="p-3 border-b" style={{ borderColor: "rgba(0,245,255,0.08)" }}>
            <div className="flex gap-1 p-0.5 rounded" style={{ background: "rgba(0,0,0,0.4)" }}>
              {[
                { id: "tutorial", icon: BookOpen, label: "TUTORIAL" },
                { id: "faq", icon: HelpCircle, label: "FAQ" },
              ].map(({ id, icon: TabIcon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-mono tracking-wide transition-all"
                  style={{
                    background: activeTab === id ? "rgba(0,245,255,0.12)" : "transparent",
                    color: activeTab === id ? CYAN : "#64748B",
                    border: activeTab === id ? `1px solid rgba(0,245,255,0.3)` : "1px solid transparent",
                  }}
                >
                  <TabIcon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-0.5">
            {activeTab === "tutorial" ? (
              tutorialSections.map((s) => (
                <NavItem
                  key={s.id}
                  section={s}
                  isActive={activeSectionId === s.id}
                  onClick={() => scrollToSection(s.id)}
                />
              ))
            ) : (
              faqSections.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded transition-all"
                  style={{ color: "#94A3B8" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#334155" }} />
                  <span className="truncate text-[10px] font-mono uppercase tracking-wide">{s.title}</span>
                </button>
              ))
            )}
          </nav>

          {/* Bottom CTA */}
          <div className="p-3 border-t" style={{ borderColor: "rgba(0,245,255,0.08)" }}>
            <Link to={createPageUrl("Transactions")}>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all"
                style={{
                  background: "rgba(0,245,255,0.08)",
                  border: `1px solid rgba(0,245,255,0.25)`,
                  color: CYAN,
                }}
              >
                <Bot className="w-3.5 h-3.5" />
                OPEN_AI_ASSIST
              </button>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Page title */}
          <div className="mb-2">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: CYAN }}>
              &lt;HELP_CENTER&gt;
            </p>
            <h1 className="text-xl font-bold text-white tracking-tight">Help & Training</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              // Step-by-step guides, FAQs, and best practices for EliteTC
            </p>
          </div>

          {/* Mobile tab bar */}
          <div className="flex gap-2 lg:hidden">
            {[
              { id: "tutorial", label: "Tutorial" },
              { id: "faq", label: "FAQ" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="px-4 py-1.5 rounded text-xs font-mono border transition-all"
                style={{
                  background: activeTab === id ? "rgba(0,245,255,0.12)" : "transparent",
                  borderColor: activeTab === id ? "rgba(0,245,255,0.4)" : "rgba(255,255,255,0.1)",
                  color: activeTab === id ? CYAN : "#64748B",
                }}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tutorial content */}
          {activeTab === "tutorial" && (
            <div className="space-y-4">
              {tutorialSections.map((section) => (
                <TutorialSection key={section.id} section={section} />
              ))}

              {/* CTA */}
              <GlassCard className="p-5 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2" style={{ color: CYAN }} />
                <p className="text-sm font-semibold text-white mb-1">Still need help?</p>
                <p className="text-xs text-slate-500 mb-3">The AI Assistant has full context on your transactions.</p>
                <div className="flex gap-2 justify-center">
                  <Link to={createPageUrl("Transactions")}>
                    <button
                      className="px-4 py-2 rounded text-xs font-mono font-semibold transition-all"
                      style={{ background: "rgba(0,245,255,0.15)", border: `1px solid rgba(0,245,255,0.4)`, color: CYAN }}
                    >
                      OPEN_AI_ASSISTANT
                    </button>
                  </Link>
                  <button
                    onClick={() => setActiveTab("faq")}
                    className="px-4 py-2 rounded text-xs font-mono border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94A3B8" }}
                  >
                    BROWSE_FAQ
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* FAQ content */}
          {activeTab === "faq" && (
            <div className="space-y-4">
              {faqSections.map((section, i) => (
                <FAQSection key={i} section={section} />
              ))}

              <GlassCard className="p-5 text-center">
                <p className="text-sm font-semibold text-white mb-1">Can't find your answer?</p>
                <p className="text-xs text-slate-500 mb-3">Try the Tutorial or ask the AI Assistant directly.</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setActiveTab("tutorial")}
                    className="px-4 py-2 rounded text-xs font-mono border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94A3B8" }}
                  >
                    VIEW_TUTORIAL
                  </button>
                  <Link to={createPageUrl("Transactions")}>
                    <button
                      className="px-4 py-2 rounded text-xs font-mono font-semibold transition-all"
                      style={{ background: "rgba(0,245,255,0.15)", border: `1px solid rgba(0,245,255,0.4)`, color: CYAN }}
                    >
                      ASK_AI_ASSISTANT
                    </button>
                  </Link>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}