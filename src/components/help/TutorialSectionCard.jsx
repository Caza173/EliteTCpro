import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function StepAccordion({ step, isOpen, onToggle }) {
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
        style={{ background: isOpen ? "var(--accent-subtle)" : "var(--card-bg)" }}
      >
        <span className="text-sm font-semibold" style={{ color: isOpen ? "var(--accent)" : "var(--text-primary)" }}>
          {step.title}
        </span>
        {isOpen
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        }
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
          {step.content.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TutorialSectionCard({ section }) {
  const [openStep, setOpenStep] = useState(0);

  return (
    <div id={section.id} className="rounded-xl border overflow-hidden scroll-mt-4"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
        <span className="text-xl">{section.icon}</span>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h2>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
          {section.steps.length} steps
        </span>
      </div>
      <div className="p-4 space-y-2">
        {section.steps.map((step, i) => (
          <StepAccordion
            key={i}
            step={step}
            isOpen={openStep === i}
            onToggle={() => setOpenStep(openStep === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}