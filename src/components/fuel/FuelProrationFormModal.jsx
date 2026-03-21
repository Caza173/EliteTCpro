import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

const FUEL_TYPES = ["propane", "oil", "kerosene", "natural_gas", "other"];

export function calcTank(tank) {
  const cap = parseFloat(tank.capacity) || 0;
  const pct = parseFloat(tank.fill_percent) || 0;
  const galRem = parseFloat(tank.gallons_remaining) || 0;
  const ppg = parseFloat(tank.price_per_gallon) || 0;
  const gallons = tank.fill_method === "percent" ? cap * (pct / 100) : galRem;
  return { gallons: Math.round(gallons * 10) / 10, subtotal: Math.round(gallons * ppg * 100) / 100 };
}

function newTank(num) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    tank_label: `Tank ${num}`,
    fuel_type: "oil",
    location: "",
    capacity: "",
    fill_method: "percent",
    fill_percent: "",
    gallons_remaining: "",
    price_per_gallon: "",
    fuel_company: "",
    phone: "",
    last_delivery_date: "",
    notes: "",
  };
}

const BLANK = {
  transaction_id: "",
  property_address: "",
  buyer_name: "",
  seller_name: "",
  buyer_agent_name: "",
  seller_agent_name: "",
  closing_date: "",
  agent_email: "",
  title_company_email: "",
  notes: "",
  tanks: [],
};

export default function FuelProrationFormModal({ proration, initialValues, currentUser, onClose, onSaved }) {
  const isEdit = !!proration?.id;
  const [source, setSource] = useState(initialValues ? "manual" : "transaction");
  const [form, setForm] = useState(() => {
    if (proration) return { ...BLANK, ...proration };
    const base = { ...BLANK, ...(initialValues || {}), tanks: [newTank(1)] };
    return base;
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date", 100),
    enabled: !isEdit,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addTank = () => setForm(p => ({ ...p, tanks: [...(p.tanks || []), newTank((p.tanks || []).length + 1)] }));
  const removeTank = (id) => setForm(p => ({ ...p, tanks: (p.tanks || []).filter(t => t.id !== id) }));
  const updateTank = (id, field, value) => setForm(p => ({
    ...p, tanks: (p.tanks || []).map(t => t.id === id ? { ...t, [field]: value } : t),
  }));

  const handleTxSelect = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    setForm(p => ({
      ...p,
      transaction_id: txId,
      property_address: tx.address || "",
      buyer_name: tx.buyers?.join(", ") || tx.buyer || "",
      seller_name: tx.sellers?.join(", ") || tx.seller || "",
      buyer_agent_name: tx.buyers_agent_name || "",
      seller_agent_name: tx.sellers_agent_name || "",
      closing_date: tx.closing_date || "",
      agent_email: tx.agent_email || "",
    }));
  };

  const totals = (form.tanks || []).reduce((acc, tank) => {
    const { gallons, subtotal } = calcTank(tank);
    return { gallons: acc.gallons + gallons, amount: acc.amount + subtotal };
  }, { gallons: 0, amount: 0 });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const tanksWithCalc = (data.tanks || []).map(tank => {
        const { gallons, subtotal } = calcTank(tank);
        return { ...tank, gallons_calculated: gallons, subtotal };
      });
      const payload = {
        ...data,
        tanks: tanksWithCalc,
        total_amount: Math.round(totals.amount * 100) / 100,
        total_gallons: Math.round(totals.gallons * 10) / 10,
        brokerage_id: currentUser?.data?.brokerage_id,
      };
      if (isEdit) return base44.entities.FuelProration.update(proration.id, payload);
      return base44.entities.FuelProration.create({ ...payload, status: "draft" });
    },
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Edit Fuel Proration" : "New Fuel Proration"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {!isEdit && !initialValues && (
          <div className="flex gap-1 p-1 mx-5 mt-4 rounded-lg bg-gray-100 flex-shrink-0">
            <button type="button" onClick={() => setSource("transaction")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${source === "transaction" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
              From Transaction
            </button>
            <button type="button" onClick={() => setSource("manual")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${source === "manual" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
              Manual Entry
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {source === "transaction" && !isEdit && !initialValues && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Select Transaction</Label>
                <Select value={form.transaction_id} onValueChange={handleTxSelect}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a transaction…" /></SelectTrigger>
                  <SelectContent>
                    {transactions.filter(t => t.status !== "cancelled").map(tx => (
                      <SelectItem key={tx.id} value={tx.id}>{tx.address}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Property Address *</Label>
                <Input className="mt-1.5" value={form.property_address} onChange={e => set("property_address", e.target.value)} required />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Buyer Name</Label>
                <Input className="mt-1.5" value={form.buyer_name} onChange={e => set("buyer_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Seller Name</Label>
                <Input className="mt-1.5" value={form.seller_name} onChange={e => set("seller_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Closing Date</Label>
                <Input type="date" className="mt-1.5" value={form.closing_date} onChange={e => set("closing_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Agent Email</Label>
                <Input type="email" className="mt-1.5" value={form.agent_email} onChange={e => set("agent_email", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Title Company Email</Label>
                <Input type="email" className="mt-1.5" value={form.title_company_email} onChange={e => set("title_company_email", e.target.value)} />
              </div>
            </div>

            {/* Tanks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Fuel Tanks</h3>
                <Button type="button" size="sm" variant="outline" onClick={addTank} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Tank
                </Button>
              </div>

              {(form.tanks || []).length === 0 && (
                <button type="button" onClick={addTank}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  + Add first tank
                </button>
              )}

              <div className="space-y-4">
                {(form.tanks || []).map((tank, idx) => {
                  const { gallons, subtotal } = calcTank(tank);
                  return (
                    <div key={tank.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tank {idx + 1}</h4>
                        {(form.tanks || []).length > 0 && (
                          <button type="button" onClick={() => removeTank(tank.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Label</Label>
                          <Input className="mt-1 text-sm" value={tank.tank_label} onChange={e => updateTank(tank.id, "tank_label", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Fuel Type</Label>
                          <Select value={tank.fuel_type} onValueChange={v => updateTank(tank.id, "fuel_type", v)}>
                            <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Location</Label>
                          <Input className="mt-1 text-sm" value={tank.location} onChange={e => updateTank(tank.id, "location", e.target.value)} placeholder="Basement" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Capacity (gal)</Label>
                          <Input type="number" className="mt-1 text-sm" value={tank.capacity} onChange={e => updateTank(tank.id, "capacity", e.target.value)} placeholder="275" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Fill Method</Label>
                          <Select value={tank.fill_method} onValueChange={v => updateTank(tank.id, "fill_method", v)}>
                            <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">% Full</SelectItem>
                              <SelectItem value="gallons">Gallons Remaining</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {tank.fill_method === "percent" ? (
                          <div>
                            <Label className="text-xs text-gray-600">% Full</Label>
                            <Input type="number" min="0" max="100" className="mt-1 text-sm" value={tank.fill_percent} onChange={e => updateTank(tank.id, "fill_percent", e.target.value)} placeholder="75" />
                          </div>
                        ) : (
                          <div>
                            <Label className="text-xs text-gray-600">Gallons Remaining</Label>
                            <Input type="number" className="mt-1 text-sm" value={tank.gallons_remaining} onChange={e => updateTank(tank.id, "gallons_remaining", e.target.value)} placeholder="200" />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-gray-600">Price / Gallon ($)</Label>
                          <Input type="number" step="0.01" className="mt-1 text-sm" value={tank.price_per_gallon} onChange={e => updateTank(tank.id, "price_per_gallon", e.target.value)} placeholder="4.25" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Fuel Company</Label>
                          <Input className="mt-1 text-sm" value={tank.fuel_company} onChange={e => updateTank(tank.id, "fuel_company", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Phone</Label>
                          <Input type="tel" className="mt-1 text-sm" value={tank.phone} onChange={e => updateTank(tank.id, "phone", e.target.value)} />
                        </div>
                      </div>
                      {(gallons > 0 || subtotal > 0) && (
                        <div className="flex gap-4 bg-blue-50 rounded-lg px-3 py-2 text-xs">
                          <span className="text-gray-600">Gallons: <span className="font-semibold text-gray-900">{gallons.toFixed(1)}</span></span>
                          <span className="text-gray-600">Subtotal: <span className="font-semibold text-emerald-700">${subtotal.toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {totals.amount > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">Total Proration</p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-gray-500">Total Gallons</p>
                    <p className="text-lg font-bold text-gray-900">{totals.gallons.toFixed(1)} gal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount Due</p>
                    <p className="text-lg font-bold text-emerald-700">${totals.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <textarea
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 h-16 resize-none"
                value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 pb-5 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : isEdit ? "Update Proration" : "Save as Draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}