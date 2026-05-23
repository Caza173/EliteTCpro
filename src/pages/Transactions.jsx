import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import "@/styles/elite-button.css";
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List, Columns, Trash2, CheckSquare, Square, X, Plus } from "lucide-react";
import StatusBoardView from "../components/transactions/StatusBoardView";
import { Skeleton } from "@/components/ui/skeleton";
import TransactionTable from "../components/transactions/TransactionTable";
import TransactionCardGrid from "../components/transactions/TransactionCardGrid";
import { useDealAccess } from "@/lib/useDealAccess";
import NewTransactionModal from "../components/transactions/NewTransactionModal";

const PAGE_SIZE = 25;

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("tx_view") || "table"); // "table" | "cards" | "board"
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [newTxHighlightId, setNewTxHighlightId] = useState(null);
  // Strictly user-isolated deal access
  const { transactions, isLoading, refetch } = useDealAccess();
  const [localOverrides, setLocalOverrides] = useState({}); // id -> { status }

  const baseList = useMemo(() => (transactions || []).map(tx =>
    localOverrides[tx.id] ? { ...tx, ...localOverrides[tx.id] } : tx
  ), [transactions, localOverrides]);

  const handleStatusChange = (id, newStatus) => {
    setLocalOverrides(prev => ({ ...prev, [id]: { status: newStatus } }));
  };

  const filtered = useMemo(() => (baseList || []).filter((tx) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      tx.address?.toLowerCase().includes(q) ||
      tx.buyer?.toLowerCase().includes(q) ||
      tx.buyers?.some(b => b.toLowerCase().includes(q)) ||
      tx.agent?.toLowerCase().includes(q) ||
      tx.mls_number?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesMonth = monthFilter === "all" || (() => {
      const d = tx.closing_date || tx.contract_date;
      if (!d) return false;
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}` === monthFilter;
    })();
    return matchesSearch && matchesStatus && matchesMonth;
  }), [baseList, search, statusFilter, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, monthFilter, transactions]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(tx => tx.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} transaction(s)? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.allSettled(
      Array.from(selectedIds).map(id =>
        base44.functions.invoke("deleteTransaction", { transaction_id: id })
      )
    );
    setDeleting(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    // Refresh by reloading the page data via the existing query
    window.location.reload();
  };

  // Build month options from available transactions
  const monthOptions = useMemo(() => {
    const seen = new Set();
    baseList.forEach(tx => {
      const d = tx.closing_date || tx.contract_date;
      if (!d) return;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      seen.add(key);
    });
    return Array.from(seen).sort().reverse().map(key => {
      const [yr, mo] = key.split("-");
      const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { value: key, label };
    });
  }, [baseList]);

  return (
    <div className="flex flex-col w-full min-w-0" style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>

      {/* Fixed header + filters */}
      <div className="flex-shrink-0 space-y-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Transactions</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {filtered.length} of {baseList.length} transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button className="elite-btn elite-btn-outline elite-btn-sm" onClick={toggleSelectAll}>
                  {selectedIds.size === filtered.length ? <CheckSquare className="w-4 h-4 mr-1.5" /> : <Square className="w-4 h-4 mr-1.5" />}
                  {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
                </button>
                {selectedIds.size > 0 && (
                  <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    {deleting ? "Deleting..." : `Delete ${selectedIds.size}`}
                  </Button>
                )}
                <button className="elite-btn elite-btn-outline elite-btn-sm" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </button>
              </>
            ) : (
              <button className="elite-btn elite-btn-outline elite-btn-sm" onClick={() => setSelectMode(true)}>
                <CheckSquare className="w-4 h-4 mr-1.5" /> Select
              </button>
            )}
            <Button
              size="sm"
              onClick={() => setShowNewTxModal(true)}
              style={{ background: "#d2a35f", color: "#050506", fontWeight: 600 }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Transaction
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by address, buyer, or agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="elite-btn elite-btn-outline elite-btn-sm w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="under_contract">Under Contract</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="withdrawn">Withdraw</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="elite-btn elite-btn-outline elite-btn-sm w-44"><SelectValue placeholder="All Months" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg border ml-auto" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
            {[
              { mode: "table", icon: List, title: "Table view" },
              { mode: "cards", icon: LayoutGrid, title: "Card view" },
              { mode: "board", icon: Columns, title: "Board view" },
            ].map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); localStorage.setItem("tx_view", mode); }}
                className={`p-1.5 rounded-md transition-colors ${viewMode === mode ? "bg-white shadow-sm" : "hover:opacity-70"}`}
                title={title}
              >
                <Icon className="w-4 h-4" style={{ color: viewMode === mode ? "var(--text-primary)" : "var(--text-muted)" }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable table / queue */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
        {(() => {
          return (
          <>
            {isLoading ? (
              <div className="space-y-3 p-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : viewMode === "board" ? (
              <StatusBoardView transactions={filtered} />
            ) : viewMode === "cards" ? (
              <div className="space-y-2">
                {selectMode && (
                  <div className="grid gap-2">
                    {paginated.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer"
                        style={{ background: selectedIds.has(tx.id) ? "var(--accent-subtle)" : "var(--card-bg)", borderColor: selectedIds.has(tx.id) ? "var(--accent)" : "var(--card-border)" }}
                        onClick={() => toggleSelect(tx.id)}>
                        {selectedIds.has(tx.id)
                          ? <CheckSquare className="w-5 h-5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                          : <Square className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{tx.address}</span>
                        <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{tx.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!selectMode && <TransactionCardGrid transactions={paginated} />}
              </div>
            ) : (
              <div style={{ width: "100%", minHeight: 300, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--card-bg)" }}>
                {selectMode ? (
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {paginated.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: selectedIds.has(tx.id) ? "var(--accent-subtle)" : "transparent" }}
                        onClick={() => toggleSelect(tx.id)}>
                        {selectedIds.has(tx.id)
                          ? <CheckSquare className="w-5 h-5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                          : <Square className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                        <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>{tx.address}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{tx.status}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.closing_date || tx.contract_date || ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <TransactionTable transactions={paginated} onStatusChange={handleStatusChange} />
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {filtered.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i + 1
                      : page <= 3 ? i + 1
                      : page >= totalPages - 2 ? totalPages - 4 + i
                      : page - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className={page === pageNum ? "bg-blue-600 hover:bg-blue-700 text-white w-9" : "w-9"}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
          );
        })()}
      </div>

      <NewTransactionModal
        open={showNewTxModal}
        onClose={() => setShowNewTxModal(false)}
        onCreated={(tx) => {
          setNewTxHighlightId(tx.id);
          if (refetch) refetch();
          setTimeout(() => setNewTxHighlightId(null), 3000);
        }}
      />
    </div>
  );
}