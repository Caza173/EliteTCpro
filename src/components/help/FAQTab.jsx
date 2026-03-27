import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { faqSections } from "@/lib/helpContent";

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
      >
        <span className="text-sm font-medium pr-4" style={{ color: "var(--text-primary)" }}>{item.question}</span>
        {isOpen
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        }
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQTab() {
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState(null);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return faqSections;
    const q = search.toLowerCase();
    return faqSections
      .map(section => ({
        ...section,
        items: section.items.filter(
          item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
        )
      }))
      .filter(section => section.items.length > 0);
  }, [search]);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <Input
          placeholder="Search questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results for "{search}"</p>
        </div>
      ) : (
        filteredSections.map((section, si) => (
          <div key={si} className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
            </div>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              return (
                <FAQItem
                  key={key}
                  item={item}
                  isOpen={openItem === key}
                  onToggle={() => setOpenItem(openItem === key ? null : key)}
                />
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}