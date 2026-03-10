import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, PieChart, Minus, Save, RefreshCw, FileSearch, FileText, Loader2 } from "lucide-react";
import CommissionBreakdown from "./CommissionBreakdown";
import Section20ReviewPanel from "./Section20ReviewPanel";
import { isOwnerOrAdmin } from "../auth/useCurrentUser";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function calcFinancials(f) {
  const gross = (f.sale_price || 0) * ((f.commission_percent || 0) / 100);
  const referralAmt = gross * ((f.referral_percent || 0) / 100);
  const afterReferral = gross - referralAmt;
  const brokerSplitAmt = afterReferral * ((f.broker_split_percent || 0) / 100);
  const agentAfterSplit = afterReferral - brokerSplitAmt;
  const franchiseFeeAmt = agentAfterSplit * ((f.franchise_fee_percent || 0) / 100);
  const txFee = f.transaction_fee || 0;
  const eoFee = f.eo_fee || 0;
  const otherFees = f.other_brokerage_fees || 0;
  const professionalFeeAmt = f.professional_fee_amount || 0;
  const sellerConcessionAmt = f.seller_concession_amount || 0;
  const netBeforeExpenses = agentAfterSplit - franchiseFeeAmt - txFee - eoFee - otherFees - professionalFeeAmt - sellerConcessionAmt;
  const net = netBeforeExpenses - (f.expenses_total || 0);
  return { gross, referralAmt, afterReferral, brokerSplitAmt, agentAfterSplit, franchiseFeeAmt, txFee, eoFee, otherFees, professionalFeeAmt, sellerConcessionAmt, netBeforeExpenses, net };
}

export default function FinanceTab({ transaction, currentUser, parsedPsData }) {
  const queryClient = useQueryClient();
  const canEditCommission = isOwnerOrAdmin(currentUser) || currentUser?.role === "agent";

  const { data: financeRecords = [], isLoading } = useQuery({
    queryKey: ["finance", transaction.id],
    queryFn: () => base44.entities.TransactionFinance.filter({ transaction_id: transaction.id }),
  });

  const finance = financeRecords[0];
  const expensesTotal = 0;

  // Local form state
  const [form, setForm] = useState({
    sale_price: "",
    commission_percent: "",
    commission_side: "buyer",
    referral_percent: 0,
    broker_split_percent: 20,
    broker_cap: 0,
    franchise_fee_percent: 0,
    transaction_fee: 0,
    eo_fee: 0,
    other_brokerage_fees: 0,
    professional_fee_amount: 0,
    professional_fee_type: "percent",
    professional_fee_value: 0,
    seller_concession_amount: 0,
  });

  // Populate from user profile defaults + existing finance record
  useEffect(() => {
    const defaults = {
      broker_split_percent: currentUser?.broker_split_percent ?? 20,
      franchise_fee_percent: currentUser?.franchise_fee_percent ?? 0,
      transaction_fee: currentUser?.transaction_fee ?? 0,
      eo_fee: currentUser?.eo_fee ?? 0,
      broker_cap: currentUser?.broker_cap ?? 0,
    };
    if (finance) {
      setForm({
        sale_price: finance.sale_price || "",
        commission_percent: finance.commission_percent || "",
        commission_side: finance.commission_side || "buyer",
        referral_percent: finance.referral_percent ?? 0,
        broker_split_percent: finance.broker_split_percent ?? defaults.broker_split_percent,
        broker_cap: finance.broker_cap ?? defaults.broker_cap,
        franchise_fee_percent: finance.franchise_fee_percent ?? defaults.franchise_fee_percent,
        transaction_fee: finance.transaction_fee ?? defaults.transaction_fee,
        eo_fee: finance.eo_fee ?? defaults.eo_fee,
        other_brokerage_fees: finance.other_brokerage_fees ?? 0,
        professional_fee_amount: finance.professional_fee_amount ?? 0,
        professional_fee_type: finance.professional_fee_type ?? "percent",
        professional_fee_value: finance.professional_fee_value ?? 0,
        seller_concession_amount: finance.seller_concession_amount ?? 0,
      });
    } else {
      // Pre-populate from transaction
      setForm((prev) => ({
        ...prev,
        ...defaults,
        sale_price: transaction.sale_price || "",
        commission_percent: transaction.commission ? parseFloat(transaction.commission) || "" : "",
      }));
    }
  }, [finance, currentUser, transaction]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (finance?.id) {
        return base44.entities.TransactionFinance.update(finance.id, data);
      }
      return base44.entities.TransactionFinance.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", transaction.id] }),
  });

  const set = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));
  const setNum = (field, val) => setForm((prev) => ({ ...prev, [field]: parseFloat(val) || 0 }));

  const handleSection20Apply = ({ professionalFeeType, professionalFeeValue, professionalFeeAmount, sellerConcessionAmount }) => {
    setForm((prev) => ({
      ...prev,
      professional_fee_type: professionalFeeType,
      professional_fee_value: professionalFeeValue,
      professional_fee_amount: professionalFeeAmount,
      seller_concession_amount: sellerConcessionAmount,
    }));
  };

  const computed = calcFinancials({ ...form, expenses_total: expensesTotal });

  const handleSave = () => {
    saveMutation.mutate({
      transaction_id: transaction.id,
      brokerage_id: transaction.brokerage_id,
      ...form,
      gross_commission: computed.gross,
      referral_amount: computed.referralAmt,
      expenses_total: expensesTotal,
      net_commission: computed.net,
      professional_fee_amount: computed.professionalFeeAmt,
      seller_concession_amount: computed.sellerConcessionAmt,
    });
  };

  if (isLoading) return <div className="py-8 text-center text-gray-400 text-sm">Loading finance data...</div>;

  return (
    <div className="space-y-5 mt-4">
      {/* Deal Summary */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-500" /> Deal Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Property Address</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">{transaction.address}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Transaction Type</Label>
              <p className="text-sm font-medium capitalize mt-1">{transaction.transaction_type || "buyer"}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Closing Date</Label>
              <p className="text-sm font-medium mt-1">{transaction.closing_date || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Sale Price</Label>
              <Input
                type="number"
                placeholder="e.g. 600000"
                value={form.sale_price}
                onChange={(e) => set("sale_price", parseFloat(e.target.value) || "")}
                disabled={!canEditCommission}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Commission %</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 2.5"
                value={form.commission_percent}
                onChange={(e) => set("commission_percent", parseFloat(e.target.value) || "")}
                disabled={!canEditCommission}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Commission Side</Label>
              <Select value={form.commission_side} onValueChange={(v) => set("commission_side", v)} disabled={!canEditCommission}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer Side</SelectItem>
                  <SelectItem value="listing">Listing Side</SelectItem>
                  <SelectItem value="both">Both Sides (Dual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brokerage Settings */}
      {canEditCommission && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-500" /> Brokerage Split Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: "Broker Split %", field: "broker_split_percent", suffix: "%" },
                { label: "Franchise Fee %", field: "franchise_fee_percent", suffix: "%" },
                { label: "Transaction Fee ($)", field: "transaction_fee", suffix: "$" },
                { label: "E&O Fee ($)", field: "eo_fee", suffix: "$" },
                { label: "Broker Cap ($)", field: "broker_cap", suffix: "$" },
                { label: "Other Fees ($)", field: "other_brokerage_fees", suffix: "$" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form[field]}
                    onChange={(e) => setNum(field, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral */}
      {canEditCommission && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Minus className="w-4 h-4 text-orange-500" /> Referral Fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Referral %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.referral_percent}
                  onChange={(e) => setNum("referral_percent", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Referral Amount</Label>
                <div className="h-8 flex items-center text-sm font-semibold text-orange-600 bg-orange-50 rounded-md px-3 border border-orange-100">
                  {fmt(computed.referralAmt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 20 Review Panel */}
      {parsedPsData && (
        <Section20ReviewPanel
          parsed={parsedPsData}
          salePrice={parseFloat(form.sale_price) || 0}
          onApply={handleSection20Apply}
        />
      )}

      {/* Section 20 Applied Values Display */}
      {(form.professional_fee_amount > 0 || form.seller_concession_amount > 0) && (
        <Card className="border-amber-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-amber-500" /> Additional Compensation (Section 20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {form.professional_fee_amount > 0 && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">
                    Professional Fee {form.professional_fee_type === "percent" ? `(${form.professional_fee_value}%)` : ""}
                  </Label>
                  <Input
                    type="number"
                    value={form.professional_fee_amount}
                    onChange={(e) => setNum("professional_fee_amount", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {form.seller_concession_amount > 0 && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Seller Concession</Label>
                  <Input
                    type="number"
                    value={form.seller_concession_amount}
                    onChange={(e) => setNum("seller_concession_amount", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Breakdown */}
      <CommissionBreakdown computed={computed} form={form} />

      {/* Net Deal Profit */}
      <Card className="border-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Net Deal Value</p>
              <p className={`text-4xl font-bold ${computed.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(computed.net)}
              </p>
              <p className="text-slate-400 text-xs mt-2">After all deductions & expenses</p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs text-slate-400">Gross Commission <span className="text-white font-medium ml-2">{fmt(computed.gross)}</span></div>
              <div className="text-xs text-slate-400">Referral <span className="text-orange-400 font-medium ml-2">-{fmt(computed.referralAmt)}</span></div>
              <div className="text-xs text-slate-400">Broker Split <span className="text-red-400 font-medium ml-2">-{fmt(computed.brokerSplitAmt)}</span></div>
              <div className="text-xs text-slate-400">Fees <span className="text-red-400 font-medium ml-2">-{fmt(computed.franchiseFeeAmt + computed.txFee + computed.eoFee + computed.otherFees)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["finance", transaction.id] })}
        >
          <RefreshCw className="w-4 h-4 mr-1.5" /> Reset
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saveMutation.isPending ? "Saving..." : "Save Finance Data"}
        </Button>
      </div>
    </div>
  );
}