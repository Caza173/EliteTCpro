import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Save } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const FIELDS = [
  { key: "seller_credit", label: "Seller Credit", color: "text-amber-600" },
  { key: "closing_cost_credit", label: "Closing Cost Credit", color: "text-orange-600" },
  { key: "repair_credit", label: "Repair Credit", color: "text-red-500" },
  { key: "hoa_proration", label: "HOA Proration", color: "text-purple-600" },
  { key: "tax_proration", label: "Tax Proration", color: "text-blue-600" },
  { key: "fuel_proration", label: "Fuel Proration", color: "text-emerald-600" },
  { key: "other_adjustments", label: "Other Adjustments", color: "text-gray-600" },
];

export default function CreditsProrationSection({ financeData, onSave, disabled }) {
  const initial = financeData?.adjustments_json
    ? (typeof financeData.adjustments_json === "string" ? JSON.parse(financeData.adjustments_json) : financeData.adjustments_json)
    : {};

  const [vals, setVals] = useState(() =>
    FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: initial[f.key] || 0 }), {})
  );
  const [dirty, setDirty] = useState(false);
  const [notes, setNotes] = useState(initial.notes || "");

  const set = (k, v) => { setVals(p => ({ ...p, [k]: parseFloat(v) || 0 })); setDirty(true); };
  const total = Object.values(vals).reduce((a, b) => a + b, 0);

  const handleSave = () => {
    onSave?.({ adjustments_json: { ...vals, notes } });
    setDirty(false);
  };

  return (
    <Card className="border shadow-sm" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <CreditCard className="w-4 h-4 text-amber-500" /> Credits & Prorations
          </CardTitle>
          {total > 0 && (
            <span className="text-xs font-semibold text-amber-600">Total: {fmt(total)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {FIELDS.map(({ key, label, color }) => (
            <div key={key}>
              <Label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>{label}</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>$</span>
                <Input
                  type="number"
                  value={vals[key] || ""}
                  onChange={e => set(key, e.target.value)}
                  disabled={disabled}
                  className="pl-5 h-7 text-xs"
                  placeholder="0"
                />
              </div>
              {vals[key] > 0 && (
                <p className={`text-[10px] font-semibold mt-0.5 ${color}`}>{fmt(vals[key])}</p>
              )}
            </div>
          ))}
        </div>

        <div>
          <Label className="text-[10px]" style={{ color: "var(--text-muted)" }}>Notes</Label>
          <Input
            value={notes}
            onChange={e => { setNotes(e.target.value); setDirty(true); }}
            disabled={disabled}
            className="h-7 text-xs mt-0.5"
            placeholder="Additional notes on credits/prorations"
          />
        </div>

        {!disabled && dirty && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Credits
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}