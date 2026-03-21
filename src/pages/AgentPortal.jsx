import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, LayoutGrid, List, Search } from "lucide-react";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import AgentTransactionCard from "../components/agent/AgentTransactionCard";
import AgentTransactionTable from "../components/agent/AgentTransactionTable";
import AgentCommissionApproval from "../components/agent/AgentCommissionApproval";

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) || defaultValue; } catch { return defaultValue; }
  });
  const set = (v) => { setValue(v); try { localStorage.setItem(key, v); } catch {} };
  return [value, set];
}

export default function AgentPortal() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [viewMode, setViewMode] = useLocalStorage("agentPortalView", "cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("closing_date");
  const [sortDir, setSortDir] = useState("asc");

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  const myTransactions = transactions.filter(
    (tx) => tx.agent_email === currentUser?.email || tx.created_by === currentUser?.email
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const displayed = useMemo(() => {
    let list = [...myTransactions];

    if (statusFilter !== "all") list = list.filter((tx) => tx.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((tx) =>
        [tx.address, tx.buyer, tx.seller, ...(tx.buyers || []), ...(tx.sellers || [])].some(
          (v) => v && v.toLowerCase().includes(q)
        )
      );
    }

    list.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

    return list;
  }, [myTransactions, search, statusFilter, sortKey, sortDir]);

  if (userLoading || txLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (myTransactions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Transactions Found</h2>
        <p className="text-gray-400 text-sm">Your transactions will appear here once your TC assigns them to your email.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <AgentCommissionApproval currentUser={currentUser} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            My Transactions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Track your deals, view deadlines, and upload documents.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("cards")}
            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === "cards" ? "shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            style={viewMode === "cards" ? { background: "var(--card-bg)" } : {}}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={`h-8 px-3 gap-1.5 text-xs font-medium transition-all ${viewMode === "list" ? "shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            style={viewMode === "list" ? { background: "var(--card-bg)" } : {}}
          >
            <List className="w-3.5 h-3.5" /> List
          </Button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by address, buyer, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Showing {displayed.length} of {myTransactions.length} transaction{myTransactions.length !== 1 ? "s" : ""}
      </p>

      {/* Views */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((tx) => <AgentTransactionCard key={tx.id} tx={tx} />)}
          {displayed.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-gray-400">
              No transactions match your search.
            </div>
          )}
        </div>
      ) : (
        <AgentTransactionTable
          transactions={displayed}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}
    </div>
  );
}