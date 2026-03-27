import React from "react";

export default function TutorialSidebar({ sections, activeId, onSelect }) {
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-0 rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sections</p>
        </div>
        <nav className="py-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors"
              style={{
                background: activeId === section.id ? "var(--accent-subtle)" : "transparent",
                color: activeId === section.id ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: activeId === section.id ? 600 : 400,
                borderLeft: activeId === section.id ? "3px solid var(--accent)" : "3px solid transparent",
              }}
            >
              <span>{section.icon}</span>
              <span className="truncate">{section.title}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}