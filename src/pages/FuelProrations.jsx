import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Droplets } from "lucide-react";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import FuelProrationFormModal from "../components/fuel/FuelProrationFormModal";
import FuelProrationDetailModal from "../components/fuel/FuelProrationDetailModal";

const STATUS_STYLES = { draft: "bg-gray-100 text-gray-600", ready: "bg-blue-50 text-blue-700", sent: "bg-purple-50 text-purple-700" };
const STATUS_LABELS = { draft: "Draft", ready: "Ready", sent: "Sent" };
const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

export default function FuelProrations() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: prorations = [], isLoading } = useQuery({
    queryKey: ["fuelProrations"],
    queryFn: () => base44.entities.FuelProration.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FuelProration.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fuelProrations"] }),
  });

  const filtered = prorations.filter(p =>
    !search || p.property_address?.toLowerCase().includes(search.toLowerCase()) ||
    p.buyer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["fuelProrations"] });
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Fuel Prorations</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Calculate fuel tank reimbursements at closing
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ background: "var(--accent)", color: "var(--accent-text)" }} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Proration
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by address..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="theme-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Droplets className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No fuel prorations yet.</p>
            <Button size="sm" className="mt-3" onClick={() => setShowForm(true)} style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              Create First
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
                  {["Property Address", "Buyer / Seller", "Tanks", "Total Gallons", "Total Amount", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{p.property_address}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.buyer_name || p.seller_name || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{(p.tanks || []).length}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.total_gallons ? `${Number(p.total_gallons).toFixed(1)} gal` : "—"}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{fmt$(p.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
                        {STATUS_LABELS[p.status] || "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(p)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-xs text-gray-500 hover:underline">Edit</button>
                        <button onClick={() => { if (window.confirm("Delete this proration?")) deleteMutation.mutate(p.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <FuelProrationFormModal
          proration={editing}
          currentUser={currentUser}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {viewing && (
        <FuelProrationDetailModal
          proration={viewing}
          onClose={() => setViewing(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["fuelProrations"] });
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}