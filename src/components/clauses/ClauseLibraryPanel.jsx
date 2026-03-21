import React, { useState, useMemo } from "react";
import { CLAUSE_LIBRARY, CLAUSE_CATEGORIES } from "@/lib/clauseLibrary";
import { Search, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TYPE_STYLES = {
  extension:    "bg-blue-50 text-blue-700 border-blue-200",
  contingency:  "bg-amber-50 text-amber-700 border-amber-200",
  modification: "bg-purple-50 text-purple-700 border-purple-200",
  disclosure:   "bg-teal-50 text-teal-700 border-teal-200",
  addendum:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ClauseLibraryPanel({ onAddClause, selectedIds = [] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("elitetc_clause_favorites") || "[]"); }
    catch { return []; }
  });

  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("elitetc_clause_favorites", JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CLAUSE_LIBRARY.filter(c => {
      if (!c.isActive) return false;
      if (activeCategory === "favorites") return favorites.includes(c.id);
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.includes(q))
      );
    });
  }, [search, activeCategory, favorites]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <Input placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {[{ id: "all", label: "All" }, { id: "favorites", label: "⭐ Favorites" }, ...CLAUSE_CATEGORIES.slice(1)].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeCategory === cat.id ? "text-white" : "hover:opacity-80"
            }`}
            style={{
              background: activeCategory === cat.id ? "var(--accent)" : "var(--bg-tertiary)",
              color: activeCategory === cat.id ? "white" : "var(--text-secondary)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Clause list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No clauses found.</p>
        )}
        {filtered.map(clause => {
          const isAdded = selectedIds.includes(clause.id);
          return (
            <div
              key={clause.id}
              className="rounded-xl border p-3 transition-all"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{clause.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_STYLES[clause.type] || ""}`}>{clause.type}</Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{clause.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {clause.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleFavorite(clause.id)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Toggle favorite"
                  >
                    <Star className={`w-3.5 h-3.5 ${favorites.includes(clause.id) ? "fill-amber-400 text-amber-400" : ""}`}
                      style={{ color: favorites.includes(clause.id) ? undefined : "var(--text-muted)" }} />
                  </button>
                  <button
                    onClick={() => onAddClause?.(clause)}
                    disabled={isAdded}
                    className="p-1 rounded hover:bg-blue-50 transition-colors"
                    title={isAdded ? "Already added" : "Add to addendum"}
                  >
                    <Plus className={`w-3.5 h-3.5 ${isAdded ? "text-green-500" : ""}`}
                      style={{ color: isAdded ? undefined : "var(--accent)" }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}