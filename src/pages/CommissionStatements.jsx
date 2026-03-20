import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Eye, Pencil, Receipt } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import StatementFormModal from "../components/commission/StatementFormModal";
import StatementDetailModal from "../components/commission/StatementDetailModal";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent_to_agent: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  revision_requested: "bg-amber-50 text-amber-700",
  sent_to_title: "bg-purple-50 text-purple-700",
};

const STATUS_LABELS = {
  draft: "Draft",
  sent_to_agent: "Sent to Agent",
  approved: "Approved",
  revision_requested: "Revision Requested",
  sent_to_title: "Sent to Title",
};

const fmt$ = (v) =>
  v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

export default function CommissionStatements() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editStatement, setEditStatement] = useState(null);
  const [viewStatement, setViewStatement] = useState(null);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["commissionStatements", currentUser?.data?.brokerage_id],
    queryFn: () =>
      base44.entities.CommissionStatement.filter(
        { brokerage_id: currentUser?.data?.brokerage_id },
        "-updated_date"
      ),
    enabled: !!currentUser?.data?.brokerage_id,
  });

  const filtered = useMemo(
    () =>
      statements.filter(
        (s) =>
          !search ||
          s.property_address?.toLowerCase().includes(search.toLowerCase()) ||
          s.agent_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [statements, search]
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["commissionStatements"] });

  const handleEdit = (s) => {
    setEditStatement(s);
    setViewStatement(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditStatement(null);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {showForm && (
        <StatementFormModal
          statement={editStatement}
          currentUser={currentUser}
          onClose={handleFormClose}
          onSaved={() => { refresh(); handleFormClose(); }}
        />
      )}
      {viewStatement && (
        <StatementDetailModal
          statement={viewStatement}
          onClose={() => setViewStatement(null)}
          onEdit={() => handleEdit(viewStatement)}
          onUpdated={() => { refresh(); setViewStatement(null); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Receipt className="w-5 h-5 text-blue-500" /> Commission Statements
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} statement{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 w-56"
              placeholder="Search by address or agent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            onClick={() => { setEditStatement(null); setShowForm(true); }}
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            className="gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Statement
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="theme-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>No commission statements yet.</p>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              Create your first
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
                  {["Property Address", "Agent", "Side", "Gross Commission", "Agent Net", "Status", "Last Updated", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => setViewStatement(s)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}
                  >
                    <td className="px-4 py-3 font-medium max-w-[220px]" style={{ color: "var(--text-primary)" }}>
                      <span className="truncate block">{s.property_address}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{s.agent_name || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">{s.side || "buyer"}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{fmt$(s.gross_commission)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{fmt$(s.agent_net)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}>
                        {STATUS_LABELS[s.status] || "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.updated_date ? format(new Date(s.updated_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewStatement(s)} className="h-7 px-2">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} className="h-7 px-2">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}