import React, { useState, useMemo } from "react";
import { CLAUSE_LIBRARY, CLAUSE_CATEGORIES } from "@/lib/clauseLibrary";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Star, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CreateClauseModal from "./CreateClauseModal";

const TYPE_STYLES = {
  extension:    "bg-blue-50 text-blue-700 border-blue-200",
  contingency:  "bg-amber-50 text-amber-700 border-amber-200",
  modification: "bg-purple-50 text-purple-700 border-purple-200",
  disclosure:   "bg-teal-50 text-teal-700 border-teal-200",
  addendum:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const VIEW_FILTERS = [
  { id: "all",    label: "All" },
  { id: "system", label: "System" },
  { id: "custom", label: "My Clauses" },
];

export default function ClauseLibraryPanel({ onAddClause, selectedIds = [], brokerageId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewFilter, setViewFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editClause, setEditClause] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("elitetc_clause_favorites") || "[]"); }
    catch { return []; }
  });

  const { data: customClauses = [] } = useQuery({
    queryKey: ["customClauses", brokerageId],
    queryFn: () => base44.entities.Clause.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  // Normalize custom DB clauses to same shape as system clauses
  const normalizedCustom = useMemo(() => customClauses.map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    type: c.type,
    description: c.use_case || "",
    tags: c.tags || [],
    bodyTemplate: c.text,
    requiredInputs: [],
    triggers: [],
    isActive: true,
    isCustom: true,
    _raw: c,
  })), [customClauses]);

  // Combined list: system first, then custom
  const allClauses = useMemo(() => [
    ...CLAUSE_LIBRARY.map(c => ({ ...c, isCustom: false })),
    ...normalizedCustom,
  ], [normalizedCustom]);

  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("elitetc_clause_favorites", JSON.stringify(next));
  };

  const handleDelete = async (clause) => {
    if (!clause.isCustom) return;
    await base44.entities.Clause.delete(clause.id);
    queryClient.invalidateQueries({ queryKey: ["customClauses", brokerageId] });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allClauses.filter(c => {
      if (!c.isActive) return false;
      if (viewFilter === "system" && c.isCustom) return false;
      if (viewFilter === "custom" && !c.isCustom) return false;
      if (activeCategory === "favorites") return favorites.includes(c.id);
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        c.tags.some(t => t.includes(q))
      );
    });
  }, [search, activeCategory, viewFilter, favorites, allClauses]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: search + add button */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <Input placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white whitespace-nowrap flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Clause
        </button>
      </div>

      {/* View filters: All / System / My Clauses */}
      <div className="flex gap-1 mb-2">
        {VIEW_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setViewFilter(f.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              viewFilter === f.id ? "text-white" : "hover:opacity-80"
            }`}
            style={{
              background: viewFilter === f.id ? "var(--text-secondary)" : "var(--bg-tertiary)",
              color: viewFilter === f.id ? "white" : "var(--text-secondary)",
            }}
          >
            {f.label}
            {f.id === "custom" && normalizedCustom.length > 0 && (
              <span className="ml-1 opacity-70">({normalizedCustom.length})</span>
            )}
          </button>
        ))}
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
                    {clause.isCustom ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">Custom</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-0.5">
                        <Lock className="w-2 h-2" /> System
                      </Badge>
                    )}
                  </div>
                  {clause.description && (
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{clause.description}</p>
                  )}
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
                  {clause.isCustom && (
                    <>
                      <button
                        onClick={() => setEditClause(clause._raw)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Edit clause"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(clause)}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete clause"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </>
                  )}
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

      {/* Create/Edit Modal */}
      {(showCreate || editClause) && (
        <CreateClauseModal
          brokerageId={brokerageId}
          editClause={editClause}
          onClose={() => { setShowCreate(false); setEditClause(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["customClauses", brokerageId] })}
        />
      )}
    </div>
  );
}