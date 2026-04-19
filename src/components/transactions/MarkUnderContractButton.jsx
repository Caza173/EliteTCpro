/**
 * MarkUnderContractButton
 * Only rendered for listing/seller deals that are NOT yet under contract.
 * Buyer deals NEVER show this button — they are already live transactions.
 */
import React, { useState } from "react";
import { ArrowRightCircle, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function MarkUnderContractButton({ transaction, onConverted }) {
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState([""]);
  const [buyersAgentName, setBuyersAgentName] = useState("");
  const [buyerBrokerage, setBuyerBrokerage] = useState("");
  const [salePrice, setSalePrice] = useState(transaction.sale_price || "");
  const [contractDate, setContractDate] = useState("");
  const [closingDate, setClosingDate] = useState(transaction.closing_date || "");
  const [inspectionDeadline, setInspectionDeadline] = useState("");
  const [financingDeadline, setFinancingDeadline] = useState("");
  const [earnestMoneyDeadline, setEarnestMoneyDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Safety guards: never show for buyer deals or already-under-contract
  const dealOrigin = transaction.deal_origin;
  const txType = transaction.transaction_type;
  const txPhase = transaction.transaction_phase;

  const isBuyerDeal = dealOrigin === "buyer" || txType === "buyer";
  const isAlreadyUC = txPhase === "under_contract";

  if (isBuyerDeal || isAlreadyUC) return null;

  const handleConvert = async () => {
    setSaving(true);
    const buyerList = buyers.filter(Boolean);
    await base44.functions.invoke("updateTransaction", {
      transaction_id: transaction.id,
      data: {
        transaction_type: "seller", // keep as seller side but now under contract
        transaction_phase: "under_contract",
        deal_origin: "listing",
        buyer: buyerList.join(" & "),
        buyers: buyerList,
        buyers_agent_name: buyersAgentName,
        buyer_brokerage: buyerBrokerage,
        sale_price: salePrice ? Number(salePrice) : transaction.sale_price,
        contract_date: contractDate,
        closing_date: closingDate,
        inspection_deadline: inspectionDeadline || null,
        financing_deadline: financingDeadline || null,
        earnest_money_deadline: earnestMoneyDeadline || null,
        phase: 3,
        last_activity_at: new Date().toISOString(),
      },
    });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    setSaving(false);
    setOpen(false);
    onConverted?.();
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
        onClick={() => setOpen(true)}
      >
        <ArrowRightCircle className="w-3.5 h-3.5 mr-1.5" />
        Mark Under Contract
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Mark Under Contract</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{transaction.address}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
          An offer has been accepted. Add buyer info + PSA dates to move this listing under contract.
        </div>

        {/* Buyers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Buyer(s) *</p>
          {buyers.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input value={b} onChange={e => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }}
                placeholder={i === 0 ? "Buyer full name" : "Additional buyer"} className="flex-1" />
              {buyers.length > 1 && (
                <button onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))} className="p-1.5 text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setBuyers([...buyers, ""])} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add buyer
          </button>
        </div>

        {/* Buyer agent */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Buyer's Agent</p>
            <Input value={buyersAgentName} onChange={e => setBuyersAgentName(e.target.value)} placeholder="Agent name" />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Buyer Brokerage</p>
            <Input value={buyerBrokerage} onChange={e => setBuyerBrokerage(e.target.value)} placeholder="Brokerage" />
          </div>
        </div>

        {/* Price + Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Sale Price</p>
            <Input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="e.g. 500000" />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Contract Date</p>
            <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Closing Date</p>
            <Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Earnest Money Deadline</p>
            <Input type="date" value={earnestMoneyDeadline} onChange={e => setEarnestMoneyDeadline(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Inspection Deadline</p>
            <Input type="date" value={inspectionDeadline} onChange={e => setInspectionDeadline(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Financing Deadline</p>
            <Input type="date" value={financingDeadline} onChange={e => setFinancingDeadline(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConvert} disabled={saving || !buyers.filter(Boolean).length}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Saving…" : "Mark Under Contract"}
          </Button>
        </div>
      </div>
    </div>
  );
}