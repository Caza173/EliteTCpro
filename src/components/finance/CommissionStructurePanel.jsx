import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function calcSideAmount(side, salePrice) {
  if (!salePrice || !side?.amount) return 0;
  const base = side.gross_or_net === "net"
    ? salePrice - (side.net_deduction || 0)
    : salePrice;
  if (side.calculation_type === "percentage") return base * (side.amount / 100);
  return side.amount;
}

function SideCard({ title, color, data, onChange, salePrice, disabled }) {
  const estimated = calcSideAmount(data, salePrice);

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${color}`}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{title}</p>

      {/* Calculation Type */}
      <div>
        <Label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Commission Type</Label>
        <div className="flex gap-2">
          {["percentage", "flat_fee"].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => !disabled && onChange({ ...data, calculation_type: type })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                data.calculation_type === type
                  ? "border-blue-500 bg-blue-500/10 text-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={data.calculation_type !== type ? { borderColor: "var(--card-border)", color: "var(--text-muted)" } : {}}
            >
              {type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
              {type === "percentage" ? "Percentage" : "Flat Fee"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
          {data.calculation_type === "percentage" ? "Commission %" : "Flat Amount ($)"}
        </Label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {data.calculation_type === "percentage" ? "%" : "$"}
          </span>
          <Input
            type="number"
            step={data.calculation_type === "percentage" ? "0.01" : "1"}
            value={data.amount || ""}
            onChange={e => onChange({ ...data, amount: parseFloat(e.target.value) || 0 })}
            disabled={disabled}
            className="pl-7 h-8 text-sm"
            placeholder={data.calculation_type === "percentage" ? "2.5" : "15000"}
          />
        </div>
      </div>

      {/* Calculation Method */}
      {data.calculation_type === "percentage" && (
        <div>
          <Label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Calculation Method</Label>
          <div className="flex gap-2">
            {[
              { value: "gross", label: "Gross Contract Price" },
              { value: "net", label: "Net Contract Price" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => !disabled && onChange({ ...data, gross_or_net: opt.value })}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  data.gross_or_net === opt.value
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300"
                }`}
                style={data.gross_or_net !== opt.value ? { borderColor: "var(--card-border)", color: "var(--text-muted)" } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {data.gross_or_net === "net" && (
            <div className="mt-2">
              <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>Net Deduction ($)</Label>
              <Input
                type="number"
                value={data.net_deduction || ""}
                onChange={e => onChange({ ...data, net_deduction: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="h-7 text-xs mt-0.5"
                placeholder="e.g. seller concession"
              />
            </div>
          )}
        </div>
      )}

      {/* Brokerage & Agent */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>Brokerage</Label>
          <Input
            value={data.brokerage_name || ""}
            onChange={e => onChange({ ...data, brokerage_name: e.target.value })}
            disabled={disabled}
            className="h-7 text-xs mt-0.5"
            placeholder="ABC Realty"
          />
        </div>
        <div>
          <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>Agent Name</Label>
          <Input
            value={data.agent_name || ""}
            onChange={e => onChange({ ...data, agent_name: e.target.value })}
            disabled={disabled}
            className="h-7 text-xs mt-0.5"
            placeholder="Jane Smith"
          />
        </div>
      </div>

      {/* Estimated Preview */}
      {estimated > 0 && (
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Estimated Commission</span>
          <span className="text-sm font-bold text-emerald-600">{fmt(estimated)}</span>
        </div>
      )}
    </div>
  );
}

const DEFAULT_SIDE = {
  calculation_type: "percentage",
  amount: 0,
  gross_or_net: "gross",
  net_deduction: 0,
  brokerage_name: "",
  agent_name: "",
};

export default function CommissionStructurePanel({ transaction, financeData, onSave, disabled }) {
  const salePrice = financeData?.sale_price || transaction?.sale_price || 0;

  const [structure, setStructure] = useState({
    listing_side: { ...DEFAULT_SIDE },
    buyer_side: { ...DEFAULT_SIDE },
    seller_credit_amount: 0,
    repair_credit_amount: 0,
    closing_cost_credit_amount: 0,
    concession_notes: "",
  });
  const [showConcessions, setShowConcessions] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load from financeData.commission_structure if present
  useEffect(() => {
    if (financeData?.commission_structure) {
      try {
        const parsed = typeof financeData.commission_structure === "string"
          ? JSON.parse(financeData.commission_structure)
          : financeData.commission_structure;
        setStructure(prev => ({ ...prev, ...parsed }));
      } catch {}
    } else if (transaction) {
      // Auto-populate from transaction fields
      const commPct = transaction.commission_percent || (transaction.commission ? parseFloat(transaction.commission) : 0);
      const side = transaction.transaction_type === "seller" ? "listing" : "buyer";
      const updater = {
        ...DEFAULT_SIDE,
        amount: commPct || 0,
        calculation_type: "percentage",
      };
      setStructure(prev => ({
        ...prev,
        listing_side: side === "listing" ? { ...prev.listing_side, ...updater, agent_name: transaction.sellers_agent_name || transaction.agent || "" } : prev.listing_side,
        buyer_side: side === "buyer" ? { ...prev.buyer_side, ...updater, agent_name: transaction.buyers_agent_name || transaction.agent || "" } : prev.buyer_side,
      }));
    }
  }, [financeData?.id, transaction?.id]);

  const set = (key, val) => { setStructure(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const listingEst = calcSideAmount(structure.listing_side, salePrice);
  const buyerEst = calcSideAmount(structure.buyer_side, salePrice);
  const totalEst = listingEst + buyerEst;
  const totalCredits = (structure.seller_credit_amount || 0) + (structure.repair_credit_amount || 0) + (structure.closing_cost_credit_amount || 0);

  // Conflict detection
  const alerts = [];
  if (structure.listing_side.amount > 0 && structure.listing_side.calculation_type === "percentage" && structure.buyer_side.amount > 0 && structure.buyer_side.calculation_type === "flat_fee") {
    alerts.push("Mixed commission types detected — one side is % and the other is flat fee.");
  }
  if (totalEst > salePrice * 0.15 && salePrice > 0) {
    alerts.push("Total commission exceeds 15% of sale price — please verify.");
  }

  const handleSave = () => {
    onSave?.({ commission_structure: structure });
    setDirty(false);
  };

  return (
    <Card className="border shadow-sm" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <DollarSign className="w-4 h-4 text-blue-500" /> Commission Structure
          </CardTitle>
          {totalEst > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Total Est: {fmt(totalEst)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerts */}
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {a}
          </div>
        ))}

        {/* Two-column side cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SideCard
            title="Listing Side"
            color="border-purple-200"
            data={structure.listing_side}
            onChange={val => set("listing_side", val)}
            salePrice={salePrice}
            disabled={disabled}
          />
          <SideCard
            title="Buyer Side"
            color="border-blue-200"
            data={structure.buyer_side}
            onChange={val => set("buyer_side", val)}
            salePrice={salePrice}
            disabled={disabled}
          />
        </div>

        {/* Concessions & Credits — collapsible */}
        <div className="rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            onClick={() => setShowConcessions(v => !v)}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Seller Credits & Concessions
              {totalCredits > 0 && <span className="ml-2 text-amber-600">{fmt(totalCredits)}</span>}
            </span>
            {showConcessions ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
          </button>
          {showConcessions && (
            <div className="px-4 pb-4 border-t grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ borderColor: "var(--card-border)" }}>
              {[
                { field: "seller_credit_amount", label: "Seller Credit" },
                { field: "repair_credit_amount", label: "Repair Credit" },
                { field: "closing_cost_credit_amount", label: "Closing Cost Credit" },
              ].map(({ field, label }) => (
                <div key={field} className="mt-3">
                  <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label} ($)</Label>
                  <Input
                    type="number"
                    value={structure[field] || ""}
                    onChange={e => set(field, parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="h-7 text-xs mt-0.5"
                    placeholder="0"
                  />
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3 mt-2">
                <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>Notes</Label>
                <Input
                  value={structure.concession_notes || ""}
                  onChange={e => set("concession_notes", e.target.value)}
                  disabled={disabled}
                  className="h-7 text-xs mt-0.5"
                  placeholder="e.g. seller agreed to pay buyer agent compensation"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary row */}
        {(listingEst > 0 || buyerEst > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
            {listingEst > 0 && (
              <div className="text-center">
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Listing Side</p>
                <p className="text-sm font-bold text-purple-600">{fmt(listingEst)}</p>
              </div>
            )}
            {buyerEst > 0 && (
              <div className="text-center">
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Buyer Side</p>
                <p className="text-sm font-bold text-blue-600">{fmt(buyerEst)}</p>
              </div>
            )}
            {totalCredits > 0 && (
              <div className="text-center">
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Credits</p>
                <p className="text-sm font-bold text-amber-600">-{fmt(totalCredits)}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Total Commission</p>
              <p className="text-sm font-bold text-emerald-600">{fmt(totalEst)}</p>
            </div>
          </div>
        )}

        {!disabled && dirty && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Save Commission Structure
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}