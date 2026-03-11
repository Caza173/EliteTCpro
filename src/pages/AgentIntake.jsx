import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, CheckCircle, FileSearch, Building2, Link2, Copy, Plus, X } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { generateSmartTasks } from "../components/transactions/defaultTasks";
import PurchaseAgreementUpload from "../components/forms/PurchaseAgreementUpload";
import ParsedDeadlinesPreview from "../components/forms/ParsedDeadlinesPreview";

const initial = {
  agent: "", agent_email: "",
  buyer: "", seller: "",
  buyers_agent_name: "", sellers_agent_name: "",
  buyer_brokerage: "", seller_brokerage: "",
  closing_title_company: "",
  address: "", mls_number: "", commission: "",
  sale_price: "",
  transaction_type: "buyer",
  is_cash_transaction: false,
  client_email: "", client_phone: "",
  contract_date: "", closing_date: "",
  earnest_money_deadline: "", inspection_deadline: "",
  due_diligence_deadline: "", financing_deadline: "",
};

export default function AgentIntake() {
  const [form, setForm] = useState(initial);
  const [buyers, setBuyers] = useState([""]);
  const [sellers, setSellers] = useState([""]);
  const [parsedData, setParsedData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me(), retry: false });
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createTransaction', data);
      const tx = res.data;
      if (data.client_email) {
        try { await base44.users.inviteUser(data.client_email, "user"); } catch (_) {}
        const portalUrl = `${window.location.origin}${window.location.pathname}#/ClientPortal?id=${tx.id}`;
        await base44.integrations.Core.SendEmail({
          to: data.client_email,
          subject: `You're invited to track your transaction — ${data.address}`,
          body: `<p>Hello,</p>
<p>Your transaction has been submitted and you've been invited to track its progress online.</p>
<p><strong>Property:</strong> ${data.address}<br/>
<strong>Buyer:</strong> ${data.buyer}<br/>
<strong>Seller:</strong> ${data.seller}</p>
<p>Click the link below to view your transaction portal:</p>
<p><a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View My Transaction</a></p>
<p>Best regards,<br/>TC Manager</p>`,
        });
      }
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setSubmitted(true);
      setForm(initial);
      setBuyers([""]);
      setSellers([""]);
      setParsedData(null);
    },
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleParsed = (parsed) => {
    setParsedData(parsed);
    const u = {};
    if (parsed.effectiveDate)  u.contract_date            = parsed.effectiveDate;
    if (parsed.closingDate)    u.closing_date             = parsed.closingDate;
    if (parsed.propertyAddress) u.address                 = parsed.propertyAddress;
    if (parsed.buyerName)      { u.buyer = parsed.buyerName; setBuyers([parsed.buyerName]); }
    if (parsed.sellerName)     { u.seller = parsed.sellerName; setSellers([parsed.sellerName]); }
    if (parsed.buyersAgentName)    u.buyers_agent_name    = parsed.buyersAgentName;
    if (parsed.sellersAgentName)   u.sellers_agent_name   = parsed.sellersAgentName;
    if (parsed.buyerBrokerage)     u.buyer_brokerage      = parsed.buyerBrokerage;
    if (parsed.sellerBrokerage)    u.seller_brokerage     = parsed.sellerBrokerage;
    if (parsed.closingTitleCompany) u.closing_title_company = parsed.closingTitleCompany;
    if (parsed.financingCommitmentDate) u.financing_deadline = parsed.financingCommitmentDate;
    if (parsed.inspectionDeadline)   u.inspection_deadline    = parsed.inspectionDeadline;
    if (parsed.earnestMoneyDeadline) u.earnest_money_deadline = parsed.earnestMoneyDeadline;
    if (parsed.dueDiligenceDeadline) u.due_diligence_deadline = parsed.dueDiligenceDeadline;
    if (parsed.purchasePrice)        u.sale_price             = String(parsed.purchasePrice);

    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    setForm((p) => ({ ...p, ...u }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tasks = generateSmartTasks(parsedData, form.is_cash_transaction, form);
    const buyerList = buyers.filter(Boolean);
    const sellerList = sellers.filter(Boolean);
    createMutation.mutate({
      ...form,
      buyer: buyerList.join(" & "),
      seller: sellerList.join(" & "),
      buyers: buyerList,
      sellers: sellerList,
      // Store financials from extraction so FinanceTab auto-populates
      sale_price: parsedData?.purchasePrice || form.sale_price || undefined,
      phase: 1, phases_completed: [], status: "active", tasks
    });
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction Submitted!</h2>
        <p className="text-gray-500 mb-6">Your transaction has been sent to the TC for processing. All parties will be notified.</p>
        <Button onClick={() => setSubmitted(false)} className="bg-blue-600 hover:bg-blue-700">Submit Another</Button>
      </div>
    );
  }

  const intakeUrl = `${window.location.origin}${window.location.pathname}#/AgentIntake`;
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deal Intake Form</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit a new transaction to your TC. Upload the P&amp;S to auto-fill key dates.</p>
      </div>

      {/* Shareable Link Banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
        <Link2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-indigo-800">Share this intake form with agents</p>
          <p className="text-xs text-indigo-500 truncate mt-0.5">{intakeUrl}</p>
        </div>
        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex-shrink-0 h-8 text-xs" onClick={handleCopy}>
          <Copy className="w-3 h-3 mr-1" />
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>

      {/* P&S Upload */}
      <Card className="shadow-sm border-blue-100 bg-blue-50/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-base font-semibold">Upload Purchase &amp; Sales Agreement</CardTitle>
          </div>
          <CardDescription>Optional — auto-fills buyer, seller, and all deadline dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PurchaseAgreementUpload onParsed={handleParsed} />
          {parsedData && <ParsedDeadlinesPreview parsed={parsedData} isCash={form.is_cash_transaction} />}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Transaction Type & Cash Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700">Transaction Type</Label>
                <Select value={form.transaction_type} onValueChange={(v) => set("transaction_type", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="dual">Dual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between sm:w-52 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mt-0 sm:mt-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">Cash Transaction</p>
                  <p className="text-xs text-gray-400">No financing required</p>
                </div>
                <Switch checked={form.is_cash_transaction} onCheckedChange={(v) => set("is_cash_transaction", v)} />
              </div>
            </div>

            <Separator />

            {/* Property */}
            <Section label="Property">
              <F label="Property Address *" id="address">
                <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, State" required className="mt-1.5" />
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F label="MLS Number" id="mls_number">
                  <Input id="mls_number" value={form.mls_number} onChange={(e) => set("mls_number", e.target.value)} placeholder="MLS#" className="mt-1.5" />
                </F>
                <F label="Commission" id="commission">
                  <Input id="commission" value={form.commission} onChange={(e) => set("commission", e.target.value)} placeholder="3% or $12,000" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Buyer side */}
            <Section label="Buyer Side">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Buyer Name(s) *</Label>
                {buyers.map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={b}
                      onChange={(e) => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }}
                      placeholder={i === 0 ? "John Smith" : "Additional buyer name"}
                      required={i === 0}
                      className="flex-1"
                    />
                    {buyers.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setBuyers([...buyers, ""])}>
                  <Plus className="w-3 h-3 mr-1" /> Add Buyer
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <F label="Buyer's Agent Name" id="buyers_agent_name">
                  <Input id="buyers_agent_name" value={form.buyers_agent_name} onChange={(e) => set("buyers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" />
                </F>
                <F label="Buyer Brokerage" id="buyer_brokerage">
                  <Input id="buyer_brokerage" value={form.buyer_brokerage} onChange={(e) => set("buyer_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Seller side */}
            <Section label="Seller Side">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Seller Name(s) *</Label>
                {sellers.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={s}
                      onChange={(e) => { const n = [...sellers]; n[i] = e.target.value; setSellers(n); }}
                      placeholder={i === 0 ? "Robert Doe" : "Additional seller name"}
                      required={i === 0}
                      className="flex-1"
                    />
                    {sellers.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => setSellers(sellers.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setSellers([...sellers, ""])}>
                  <Plus className="w-3 h-3 mr-1" /> Add Seller
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <F label="Seller's Agent Name" id="sellers_agent_name">
                  <Input id="sellers_agent_name" value={form.sellers_agent_name} onChange={(e) => set("sellers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" />
                </F>
                <F label="Seller Brokerage" id="seller_brokerage">
                  <Input id="seller_brokerage" value={form.seller_brokerage} onChange={(e) => set("seller_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* TC + Title */}
            <Section label="Coordinator &amp; Title">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Transaction Coordinator *" id="agent">
                  <Input id="agent" value={form.agent} onChange={(e) => set("agent", e.target.value)} placeholder="TC Name" required className="mt-1.5" />
                </F>
                <F label="TC Email *" id="agent_email">
                  <Input id="agent_email" type="email" value={form.agent_email} onChange={(e) => set("agent_email", e.target.value)} placeholder="tc@office.com" required className="mt-1.5" />
                </F>
                <F label="Closing / Title Company" id="closing_title_company">
                  <Input id="closing_title_company" value={form.closing_title_company} onChange={(e) => set("closing_title_company", e.target.value)} placeholder="NH Title & Escrow" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Client contact */}
            <Section label="Client Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Client Email (gets portal invite)" id="client_email">
                  <Input id="client_email" type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} placeholder="client@email.com" className="mt-1.5" />
                </F>
                <F label="Client Phone" id="client_phone">
                  <Input id="client_phone" type="tel" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Key Dates */}
            <Section label="Key Dates &amp; Deadlines">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Contract / Effective Date" id="contract_date">
                  <Input id="contract_date" type="date" value={form.contract_date} onChange={(e) => set("contract_date", e.target.value)} className="mt-1.5" />
                </F>
                <F label="Closing / Transfer of Title Date" id="closing_date">
                  <Input id="closing_date" type="date" value={form.closing_date} onChange={(e) => set("closing_date", e.target.value)} className="mt-1.5" />
                </F>
                <F label="Earnest Money Deadline" id="earnest_money_deadline">
                  <Input id="earnest_money_deadline" type="date" value={form.earnest_money_deadline} onChange={(e) => set("earnest_money_deadline", e.target.value)} className="mt-1.5" />
                </F>
                <F label="Inspection Deadline" id="inspection_deadline">
                  <Input id="inspection_deadline" type="date" value={form.inspection_deadline} onChange={(e) => set("inspection_deadline", e.target.value)} className="mt-1.5" />
                </F>
                <F label="Due Diligence Deadline" id="due_diligence_deadline">
                  <Input id="due_diligence_deadline" type="date" value={form.due_diligence_deadline} onChange={(e) => set("due_diligence_deadline", e.target.value)} className="mt-1.5" />
                </F>
                {!form.is_cash_transaction && (
                  <F label="Financing Commitment Date" id="financing_deadline">
                    <Input id="financing_deadline" type="date" value={form.financing_deadline} onChange={(e) => set("financing_deadline", e.target.value)} className="mt-1.5" />
                  </F>
                )}
              </div>
            </Section>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 px-8">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit to TC
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function F({ label, id, children }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
    </div>
  );
}