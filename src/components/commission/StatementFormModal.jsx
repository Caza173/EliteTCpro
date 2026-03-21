import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";

const parse = (v) => parseFloat(v) || 0;

function calcCommission(form) {
  const price = parse(form.purchase_price);
  const sidePercent =
    form.side === "buyer" ? parse(form.buyer_commission_percent)
    : form.side === "listing" ? parse(form.listing_commission_percent)
    : parse(form.listing_commission_percent) + parse(form.buyer_commission_percent);
  const gross = price * sidePercent / 100;
  const brokerageSplit = gross * parse(form.brokerage_split_percent) / 100;
  const referralAmount = gross * parse(form.referral_fee) / 100;
  const agentNet = gross - brokerageSplit - referralAmount - parse(form.tc_fee) - parse(form.transaction_fee);
  return { gross, brokerageSplit, referralAmount, agentNet };
}

const BLANK = {
  transaction_id: "",
  property_address: "",
  agent_name: "",
  agent_email: "",
  closing_date: "",
  purchase_price: "",
  side: "buyer",
  listing_commission_percent: "",
  buyer_commission_percent: "",
  brokerage_split_percent: 20,
  referral_fee: 0,
  tc_fee: 0,
  transaction_fee: 0,
  title_company_email: "",
  notes: "",
};

export default function StatementFormModal({ statement, currentUser, onClose, onSaved }) {
  const [source, setSource] = useState("transaction");
  const [form, setForm] = useState(statement ? { ...BLANK, ...statement } : BLANK);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date", 100),
  });

  const { gross, brokerageSplit, referralAmount, agentNet } = calcCommission(form);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleTxSelect = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    setForm(p => ({
      ...p,
      transaction_id: txId,
      property_address: tx.address || "",
      agent_name: tx.agent || "",
      agent_email: tx.agent_email || "",
      closing_date: tx.closing_date || "",
      purchase_price: tx.sale_price || "",
      side: tx.transaction_type === "seller" ? "listing" : "buyer",
      buyer_commission_percent: tx.commission_percent || "",
      listing_commission_percent: tx.commission_percent || "",
    }));
  };

  const [saveError, setSaveError] = useState(null);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        gross_commission: gross,
        brokerage_split_amount: brokerageSplit,
        agent_net: agentNet,
        brokerage_id: currentUser?.data?.brokerage_id,
        purchase_price: parse(data.purchase_price) || 0,
        brokerage_split_percent: parse(data.brokerage_split_percent),
        listing_commission_percent: parse(data.listing_commission_percent),
        buyer_commission_percent: parse(data.buyer_commission_percent),
        referral_fee: parse(data.referral_fee),
        tc_fee: parse(data.tc_fee),
        transaction_fee: parse(data.transaction_fee),
      };
      if (statement?.id) return base44.entities.CommissionStatement.update(statement.id, payload);
      return base44.entities.CommissionStatement.create({ ...payload, status: "draft" });
    },
    onSuccess: onSaved,
    onError: (err) => setSaveError(err?.message || "Failed to save. Please try again."),
  });

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {statement ? "Edit Commission Statement" : "New Commission Statement"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {!statement && (
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

            {source === "transaction" && !statement && (
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
                <Label className="text-sm font-medium text-gray-700">Agent Name</Label>
                <Input className="mt-1.5" value={form.agent_name} onChange={e => set("agent_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Agent Email</Label>
                <Input type="text" className="mt-1.5" value={form.agent_email} onChange={e => set("agent_email", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Closing Date</Label>
                <Input type="date" className="mt-1.5" value={form.closing_date} onChange={e => set("closing_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Purchase Price ($)</Label>
                <Input type="number" className="mt-1.5" value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)} placeholder="600000" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Side</Label>
                <Select value={form.side} onValueChange={v => set("side", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer Side</SelectItem>
                    <SelectItem value="listing">Listing Side</SelectItem>
                    <SelectItem value="dual">Dual (Both Sides)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.side === "listing" || form.side === "dual") && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Listing Commission %</Label>
                  <Input type="number" step="0.01" className="mt-1.5" value={form.listing_commission_percent} onChange={e => set("listing_commission_percent", e.target.value)} placeholder="3" />
                </div>
              )}
              {(form.side === "buyer" || form.side === "dual") && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Buyer Commission %</Label>
                  <Input type="number" step="0.01" className="mt-1.5" value={form.buyer_commission_percent} onChange={e => set("buyer_commission_percent", e.target.value)} placeholder="2.5" />
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-700">Brokerage Split %</Label>
                <Input type="number" step="0.01" className="mt-1.5" value={form.brokerage_split_percent} onChange={e => set("brokerage_split_percent", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Referral Fee ($)</Label>
                <Input type="number" step="0.01" className="mt-1.5" value={form.referral_fee} onChange={e => set("referral_fee", e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">TC Fee ($)</Label>
                <Input type="number" step="0.01" className="mt-1.5" value={form.tc_fee} onChange={e => set("tc_fee", e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Transaction Fee ($)</Label>
                <Input type="number" step="0.01" className="mt-1.5" value={form.transaction_fee} onChange={e => set("transaction_fee", e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Title Company Email</Label>
                <Input type="text" className="mt-1.5" value={form.title_company_email} onChange={e => set("title_company_email", e.target.value)} placeholder="title@company.com" />
              </div>
            </div>

            {gross > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-3">Live Calculation</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Gross Commission</p>
                    <p className="text-base font-bold text-gray-900">${gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Brokerage Split</p>
                    <p className="text-base font-bold text-gray-900">−${brokerageSplit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  </div>
                  {parse(form.referral_fee) > 0 && (
                    <div>
                      <p className="text-xs text-gray-500">Referral Fee</p>
                      <p className="text-base font-bold text-red-600">−${parse(form.referral_fee).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {(parse(form.tc_fee) > 0 || parse(form.transaction_fee) > 0) && (
                    <div>
                      <p className="text-xs text-gray-500">Other Fees</p>
                      <p className="text-base font-bold text-red-600">−${(parse(form.tc_fee) + parse(form.transaction_fee)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Agent Net</p>
                    <p className="text-base font-bold text-emerald-700">${agentNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <textarea
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 h-20 resize-none"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Internal notes…"
              />
            </div>
          </div>

          {saveError && (
            <p className="px-5 pb-2 text-xs text-red-600">{saveError}</p>
          )}
          <div className="flex justify-end gap-2 px-5 pb-5 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                : statement ? "Update Statement" : "Save as Draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}