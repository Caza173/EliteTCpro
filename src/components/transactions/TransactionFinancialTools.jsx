import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Droplets } from "lucide-react";
import StatementFormModal from "../commission/StatementFormModal";
import StatementDetailModal from "../commission/StatementDetailModal";
import FuelProrationFormModal from "../fuel/FuelProrationFormModal";
import FuelProrationDetailModal from "../fuel/FuelProrationDetailModal";

const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const STMT_STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600", sent_to_agent: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700", revision_requested: "bg-amber-50 text-amber-700",
  sent_to_title: "bg-purple-50 text-purple-700",
};
const FUEL_STATUS_STYLES = { draft: "bg-gray-100 text-gray-600", ready: "bg-blue-50 text-blue-700", sent: "bg-purple-50 text-purple-700" };

export default function TransactionFinancialTools({ transaction, currentUser }) {
  const [stmtForm, setStmtForm] = useState(false);
  const [stmtDetail, setStmtDetail] = useState(null);
  const [fuelForm, setFuelForm] = useState(false);
  const [fuelDetail, setFuelDetail] = useState(null);
  const queryClient = useQueryClient();

  const { data: statements = [] } = useQuery({
    queryKey: ["commissionStatements", transaction.id],
    queryFn: () => base44.entities.CommissionStatement.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const { data: prorations = [] } = useQuery({
    queryKey: ["fuelProrations", transaction.id],
    queryFn: () => base44.entities.FuelProration.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const fuelInitialValues = {
    transaction_id: transaction.id,
    property_address: transaction.address || "",
    buyer_name: transaction.buyers?.join(", ") || transaction.buyer || "",
    seller_name: transaction.sellers?.join(", ") || transaction.seller || "",
    closing_date: transaction.closing_date || "",
    agent_email: transaction.agent_email || "",
  };

  return (
    <div className="space-y-5">
      {/* Commission Statements */}
      <div className="theme-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Commission Statements</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStmtForm(true)} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> New
          </Button>
        </div>
        {statements.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No commission statements for this transaction.</p>
            <button onClick={() => setStmtForm(true)} className="text-xs text-blue-600 hover:underline mt-1 font-medium">Create one</button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {statements.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.agent_name || "Agent"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Gross: {fmt$(s.gross_commission)} · Net: {fmt$(s.agent_net)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STMT_STATUS_STYLES[s.status] || STMT_STATUS_STYLES.draft}`}>
                    {(s.status || "draft").replace(/_/g, " ")}
                  </span>
                  <button onClick={() => setStmtDetail(s)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fuel Prorations */}
      <div className="theme-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fuel Prorations</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFuelForm(true)} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> New
          </Button>
        </div>
        {prorations.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No fuel prorations for this transaction.</p>
            <button onClick={() => setFuelForm(true)} className="text-xs text-emerald-600 hover:underline mt-1 font-medium">Create one</button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {prorations.map(fp => (
              <div key={fp.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {(fp.tanks || []).length} tank{(fp.tanks || []).length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {fp.total_gallons ? `${Number(fp.total_gallons).toFixed(1)} gal · ` : ""}Total: {fmt$(fp.total_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FUEL_STATUS_STYLES[fp.status] || FUEL_STATUS_STYLES.draft}`}>
                    {fp.status || "Draft"}
                  </span>
                  <button onClick={() => setFuelDetail(fp)} className="text-xs text-blue-600 hover:underline font-medium">View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {stmtForm && (
        <StatementFormModal
          statement={null}
          currentUser={currentUser}
          onClose={() => setStmtForm(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["commissionStatements", transaction.id] });
            setStmtForm(false);
          }}
        />
      )}
      {stmtDetail && (
        <StatementDetailModal
          statement={stmtDetail}
          onClose={() => setStmtDetail(null)}
          onEdit={() => setStmtDetail(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["commissionStatements", transaction.id] });
            setStmtDetail(null);
          }}
        />
      )}
      {fuelForm && (
        <FuelProrationFormModal
          proration={null}
          initialValues={fuelInitialValues}
          currentUser={currentUser}
          onClose={() => setFuelForm(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["fuelProrations", transaction.id] });
            setFuelForm(false);
          }}
        />
      )}
      {fuelDetail && (
        <FuelProrationDetailModal
          proration={fuelDetail}
          onClose={() => setFuelDetail(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["fuelProrations", transaction.id] });
            setFuelDetail(null);
          }}
        />
      )}
    </div>
  );
}