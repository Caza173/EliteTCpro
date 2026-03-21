import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getSuggestedClauses, fillFromTransaction } from "@/lib/clauseEngine";
import ClauseLibraryPanel from "../components/clauses/ClauseLibraryPanel";
import SmartSuggestionsPanel from "../components/clauses/SmartSuggestionsPanel";
import ClauseInputForm from "../components/clauses/ClauseInputForm";
import AddendumPreview from "../components/clauses/AddendumPreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Zap, BookOpen, Eye, ChevronRight } from "lucide-react";

const TABS = [
  { id: "library",     label: "Clause Library",  icon: BookOpen },
  { id: "suggestions", label: "Smart Suggestions", icon: Zap     },
  { id: "builder",     label: "Builder",          icon: FileText },
  { id: "preview",     label: "Preview",          icon: Eye      },
];

export default function AddendumBuilder() {
  const [selectedTxId, setSelectedTxId] = useState("");
  const [activeTab, setActiveTab] = useState("library");
  const [selectedClauses, setSelectedClauses] = useState([]); // [clauseId, ...]
  const [inputs, setInputs] = useState({});     // { [clauseId]: { [key]: value } }
  const [expandedClause, setExpandedClause] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  const { data: complianceIssues = [] } = useQuery({
    queryKey: ["complianceIssues", selectedTxId],
    queryFn: () => base44.entities.ComplianceIssue.filter({ transaction_id: selectedTxId }),
    enabled: !!selectedTxId,
  });

  const transaction = useMemo(
    () => transactions.find(t => t.id === selectedTxId) || {},
    [transactions, selectedTxId]
  );

  const suggestions = useMemo(
    () => getSuggestedClauses(transaction, complianceIssues),
    [transaction, complianceIssues]
  );

  const addClause = (clause) => {
    if (selectedClauses.includes(clause.id)) return;
    setSelectedClauses(prev => [...prev, clause.id]);
    // Auto-prefill from transaction
    const prefill = fillFromTransaction(clause, transaction);
    if (Object.keys(prefill).length > 0) {
      setInputs(prev => ({ ...prev, [clause.id]: { ...prefill, ...(prev[clause.id] || {}) } }));
    }
    setExpandedClause(clause.id);
    setActiveTab("builder");
  };

  const removeClause = (clauseId) => {
    setSelectedClauses(prev => prev.filter(id => id !== clauseId));
    setInputs(prev => { const next = { ...prev }; delete next[clauseId]; return next; });
  };

  const CLAUSE_LIBRARY_IMPORT = useMemo(async () => {
    const { CLAUSE_LIBRARY } = await import("@/lib/clauseLibrary");
    return CLAUSE_LIBRARY;
  }, []);

  // Sync: import CLAUSE_LIBRARY synchronously
  const [clauseMap, setClauseMap] = useState({});
  useMemo(() => {
    import("@/lib/clauseLibrary").then(m => {
      const map = {};
      m.CLAUSE_LIBRARY.forEach(c => { map[c.id] = c; });
      setClauseMap(map);
    });
  }, []);

  const recipientEmail = transaction.agent_email || transaction.buyers_agent_email;

  return (
    <div className="flex flex-col w-full" style={{ height: "calc(100vh - 48px)" }}>

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Addendum Builder</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>NH-compliant clause library + smart addendum generator</p>
        </div>
        <div className="sm:ml-auto w-full sm:w-64">
          <Select value={selectedTxId} onValueChange={setSelectedTxId}>
            <SelectTrigger>
              <SelectValue placeholder="Select transaction…" />
            </SelectTrigger>
            <SelectContent>
              {transactions.map(tx => (
                <SelectItem key={tx.id} value={tx.id}>
                  {tx.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex-shrink-0 flex gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--bg-tertiary)" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isBadge = tab.id === "suggestions" && suggestions.length > 0;
          const isBuilderBadge = tab.id === "builder" && selectedClauses.length > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
                activeTab === tab.id ? "bg-white shadow-sm" : "hover:opacity-70"
              }`}
              style={{ color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {(isBadge || isBuilderBadge) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: "var(--accent)" }}>
                  {tab.id === "suggestions" ? suggestions.length : selectedClauses.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* No transaction warning */}
      {!selectedTxId && (
        <div className="mb-4 px-4 py-3 rounded-xl border text-sm" style={{ borderColor: "var(--warning-bg)", background: "var(--warning-bg)", color: "var(--warning)" }}>
          Select a transaction above to enable smart suggestions and auto-fill.
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-4 min-h-0">

        {/* Left/main panel */}
        <div className="flex-1 min-w-0 overflow-y-auto">

          {/* LIBRARY TAB */}
          {activeTab === "library" && (
            <ClauseLibraryPanel onAddClause={addClause} selectedIds={selectedClauses} />
          )}

          {/* SUGGESTIONS TAB */}
          {activeTab === "suggestions" && (
            <div>
              {!selectedTxId ? (
                <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>Select a transaction to see smart suggestions.</p>
              ) : (
                <SmartSuggestionsPanel
                  suggestions={suggestions}
                  onAddClause={addClause}
                  selectedIds={selectedClauses}
                />
              )}
            </div>
          )}

          {/* BUILDER TAB */}
          {activeTab === "builder" && (
            <div className="space-y-3">
              {selectedClauses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No clauses added yet.</p>
                  <button
                    onClick={() => setActiveTab("library")}
                    className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto"
                    style={{ color: "var(--accent)" }}
                  >
                    Browse Clause Library <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                selectedClauses.map(clauseId => {
                  const clause = clauseMap[clauseId];
                  if (!clause) return null;
                  return (
                    <ClauseInputForm
                      key={clauseId}
                      clause={clause}
                      values={inputs[clauseId] || {}}
                      onChange={vals => setInputs(prev => ({ ...prev, [clauseId]: vals }))}
                      onRemove={() => removeClause(clauseId)}
                      expanded={expandedClause === clauseId}
                      onToggle={() => setExpandedClause(expandedClause === clauseId ? null : clauseId)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* PREVIEW TAB */}
          {activeTab === "preview" && (
            <div style={{ height: "calc(100vh - 220px)" }} className="flex flex-col">
              <AddendumPreview
                transaction={transaction}
                selectedClauses={selectedClauses}
                inputs={inputs}
                recipientEmail={recipientEmail}
              />
            </div>
          )}
        </div>

        {/* Right: Summary sidebar (builder + preview tabs) */}
        {(activeTab === "builder" || activeTab === "preview") && selectedClauses.length > 0 && (
          <div className="w-52 flex-shrink-0 hidden lg:block">
            <div className="rounded-xl border p-3 sticky top-0" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                ADDENDUM ({selectedClauses.length} clause{selectedClauses.length > 1 ? "s" : ""})
              </p>
              <div className="space-y-1.5">
                {selectedClauses.map((id, i) => {
                  const c = clauseMap[id];
                  if (!c) return null;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                      <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{c.name}</p>
                    </div>
                  );
                })}
              </div>
              {activeTab === "builder" && (
                <button
                  onClick={() => setActiveTab("preview")}
                  className="mt-3 w-full text-xs font-medium py-2 rounded-lg transition-colors"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  Preview Addendum →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}