import React, { useState } from "react";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

const CHECKLIST = [
  { key: "profile", label: "Complete your profile", check: (u) => !!u?.profile_completed },
  { key: "intent", label: "Choose your path", check: (u) => !!u?.onboarding_intent },
  { key: "transaction", label: "Create first transaction", check: (u) => (u?.onboarding_step || 0) >= 4 },
  { key: "document", label: "Upload a P&S document", check: (u) => (u?.onboarding_step || 0) >= 5 },
  { key: "complete", label: "Finish onboarding", check: (u) => !!u?.onboarding_complete },
];

export default function GetStartedChecklist({ user }) {
  const [open, setOpen] = useState(true);

  if (!user || user?.onboarding_complete) return null;

  const completed = CHECKLIST.filter((item) => item.check(user)).length;
  const total = CHECKLIST.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border overflow-hidden mb-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Get Started Checklist
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {completed}/{total} complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-blue-500">{pct}%</span>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </button>

      {/* Items */}
      {open && (
        <div className="border-t px-4 py-3 space-y-2.5" style={{ borderColor: "var(--card-border)" }}>
          {CHECKLIST.map((item) => {
            const done = item.check(user);
            return (
              <div key={item.key} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                )}
                <span
                  className={`text-sm ${done ? "line-through" : ""}`}
                  style={{ color: done ? "var(--text-muted)" : "var(--text-primary)" }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}

          {/* Resume link */}
          {!user?.onboarding_complete && (
            <Link
              to="/onboarding"
              className="inline-block mt-2 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
            >
              Resume onboarding →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}