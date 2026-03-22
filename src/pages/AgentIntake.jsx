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
import { Loader2, Send, CheckCircle, FileSearch, Link2, Copy, Plus, X, Upload, FileText, Zap, Home, FileSignature, UserCheck } from "lucide-react";
import { generateSmartTasks } from "../components/transactions/defaultTasks";
import PurchaseAgreementUpload from "../components/forms/PurchaseAgreementUpload";
import ParsedDeadlinesPreview from "../components/forms/ParsedDeadlinesPreview";
import { getStartingPhase, generateTasksForPhase } from "../lib/taskLibrary";

// dealType: "listing" | "listing_uc" | "buyer_uc"
const DEAL_TYPES = [
  {
    id: "listing",
    label: "Listing (Pre-Listing)",
    desc: "You represent the seller — MLS, photos, showings. No buyer or PSA yet.",
    icon: Home,
    color: "#d97706",
    bg: "#fef3c7",
  },
  {
    id: "listing_uc",
    label: "Listing Under Contract",
    desc: "You represent the seller — an offer has been accepted. PSA + buyer info required.",
    icon: FileSignature,
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    id: "buyer_uc",
    label: "Buyer Under Contract",
    desc: "You represent the buyer — PSA signed. Lender, inspections, appraisal tracked.",
    icon: UserCheck,
    color: "#2563eb",
    bg: "#eff6ff",
  },
];

const initialListing = {
  agent: "", agent_email: "",
  sellers_agent_name: "", seller_brokerage: "",
  address: "", mls_number: "", commission: "",
  sale_price: "", list_price: "",
  client_email: "", client_phone: "",
  contract_date: "", closing_date: "",
  transaction_type: "seller",
};

const initialListingUC = {
  agent: "", agent_email: "",
  sellers_agent_name: "", seller_brokerage: "",
  buyers_agent_name: "", buyer_brokerage: "",
  closing_title_company: "",
  address: "", mls_number: "", commission: "",
  sale_price: "",
  transaction_type: "seller",
  is_cash_transaction: false,
  client_email: "", client_phone: "",
  contract_date: "", closing_date: "",
  earnest_money_deadline: "", inspection_deadline: "",
  due_diligence_deadline: "", financing_deadline: "",
};

const initialBuyerUC = {
  agent: "", agent_email: "",
  buyers_agent_name: "", sellers_agent_name: "",
  buyer_brokerage: "", seller_brokerage: "",
  closing_title_company: "",
  lender_name: "", lender_email: "", lender_phone: "",
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
  const [dealType, setDealType] = useState(null); // "listing" | "purchase"
  const [form, setForm] = useState({});
  const [buyers, setBuyers] = useState([""]);
  const [sellers, setSellers] = useState([""]);
  const [parsedData, setParsedData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [docType, setDocType] = useState("ps");
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
          body: `<p>Hello,</p><p>Your transaction has been submitted and you've been invited to track its progress online.</p><p><strong>Property:</strong> ${data.address}</p><p><a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View My Transaction</a></p><p>Best regards,<br/>TC Manager</p>`,
        });
      }
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setSubmitted(true);
    },
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const selectDealType = (type) => {
    setDealType(type);
    setForm(type === "listing" ? { ...initialListing } : { ...initialPurchase });
    setBuyers([""]);
    setSellers([""]);
    setParsedData(null);
  };

  const handleParsed = (parsed) => {
    setParsedData(parsed);
    const u = {};
    if (parsed.effectiveDate)       u.contract_date            = parsed.effectiveDate;
    if (parsed.closingDate)         u.closing_date             = parsed.closingDate;
    if (parsed.propertyAddress)     u.address                  = parsed.propertyAddress;
    if (parsed.buyerName)           { u.buyer = parsed.buyerName; setBuyers([parsed.buyerName]); }
    if (parsed.sellerName)          { u.seller = parsed.sellerName; setSellers([parsed.sellerName]); }
    if (parsed.buyersAgentName)     u.buyers_agent_name        = parsed.buyersAgentName;
    if (parsed.sellersAgentName)    u.sellers_agent_name       = parsed.sellersAgentName;
    if (parsed.buyerBrokerage)      u.buyer_brokerage          = parsed.buyerBrokerage;
    if (parsed.sellerBrokerage)     u.seller_brokerage         = parsed.sellerBrokerage;
    if (parsed.closingTitleCompany) u.closing_title_company    = parsed.closingTitleCompany;
    if (parsed.financingCommitmentDate) u.financing_deadline   = parsed.financingCommitmentDate;
    if (parsed.inspectionDeadline)  u.inspection_deadline      = parsed.inspectionDeadline;
    if (parsed.earnestMoneyDeadline) u.earnest_money_deadline  = parsed.earnestMoneyDeadline;
    if (parsed.dueDiligenceDeadline) u.due_diligence_deadline  = parsed.dueDiligenceDeadline;
    if (parsed.purchasePrice)       u.sale_price               = String(parsed.purchasePrice);
    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    setForm((p) => ({ ...p, ...u }));
  };

  const handleListingParsed = (data) => {
    const u = {};
    if (data.seller_names)            { u.seller = data.seller_names; setSellers([data.seller_names]); }
    if (data.property_address)        u.address = data.property_address;
    if (data.list_price)              u.sale_price = String(data.list_price);
    if (data.firm_name)               u.seller_brokerage = data.firm_name;
    if (data.designated_agent)        u.sellers_agent_name = data.designated_agent;
    if (data.listing_start_date)      u.contract_date = data.listing_start_date;
    if (data.listing_expiration_date) u.closing_date = data.listing_expiration_date;
    if (data.listing_commission_percent) u.commission = `${data.listing_commission_percent}%`;
    setForm((p) => ({ ...p, ...u }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isListing = dealType === "listing";
    const sellerList = sellers.filter(Boolean);
    const buyerList = buyers.filter(Boolean);

    const startPhase = getStartingPhase(isListing ? "listing" : "buyer");
    const tasks = isListing ? [] : generateSmartTasks(parsedData, form.is_cash_transaction, form);

    createMutation.mutate({
      ...form,
      buyer: isListing ? "" : buyerList.join(" & "),
      buyers: isListing ? [] : buyerList,
      seller: sellerList.join(" & "),
      sellers: sellerList,
      sale_price: form.sale_price ? Number(form.sale_price) : (parsedData?.purchasePrice || undefined),
      transaction_type: isListing ? "seller" : (form.transaction_type || "buyer"),
      transaction_phase: isListing ? "intake" : "under_contract",
      status: isListing ? "active" : "active",
      phase: startPhase,
      phases_completed: [],
      tasks,
    });
  };

  const intakeUrl = `${window.location.origin}${window.location.pathname}#/AgentIntake`;
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── SUCCESS ──────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {dealType === "listing" ? "Listing Created!" : "Transaction Submitted!"}
        </h2>
        <p className="text-gray-500 mb-6">
          {dealType === "listing"
            ? "Your listing has been created. You can manage it from the Transactions page."
            : "Your transaction has been sent to the TC. All parties will be notified."}
        </p>
        <Button onClick={() => { setSubmitted(false); setDealType(null); }} className="bg-blue-600 hover:bg-blue-700">
          Submit Another
        </Button>
      </div>
    );
  }

  // ── STEP 1: Deal Type Selection ───────────────────────────────────────────────
  if (!dealType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deal Intake</h1>
          <p className="text-sm text-gray-500 mt-0.5">What are you creating today?</p>
        </div>

        {/* Shareable Link Banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <Link2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-800">Share intake form</p>
            <p className="text-xs text-indigo-500 truncate mt-0.5">{intakeUrl}</p>
          </div>
          <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex-shrink-0 h-8 text-xs" onClick={handleCopy}>
            <Copy className="w-3 h-3 mr-1" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEAL_TYPES.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectDealType(id)}
              className="flex flex-col items-start gap-3 p-6 rounded-2xl border-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md"
              style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: id === "listing" ? "#fef3c7" : "#eff6ff" }}>
                <Icon className="w-6 h-6" style={{ color: id === "listing" ? "#d97706" : "#2563eb" }} />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isListing = dealType === "listing";

  // ── STEP 2: Form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setDealType(null)} className="text-sm text-blue-600 hover:underline">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isListing ? "New Listing" : "New Transaction (Under Contract)"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isListing ? "Create a listing file — buyer fields not required yet." : "Upload P&S to auto-fill key dates."}
          </p>
        </div>
      </div>

      {/* Document Upload */}
      <Card className="shadow-sm border-blue-100 bg-blue-50/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-base font-semibold">Upload Agreement</CardTitle>
            </div>
            {!isListing && (
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-white border border-gray-200">
                <button type="button" onClick={() => setDocType("ps")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${docType === "ps" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Purchase &amp; Sale
                </button>
                <button type="button" onClick={() => setDocType("buyer_agency")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${docType === "buyer_agency" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Buyer Agency
                </button>
              </div>
            )}
          </div>
          <CardDescription>
            {isListing ? "Optional — auto-fills seller, list price, commission" : "Optional — auto-fills buyer, seller, and all deadline dates"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isListing ? (
            <AgencyDocUpload docType="listing" onParsed={handleListingParsed} />
          ) : docType === "ps" ? (
            <>
              <PurchaseAgreementUpload onParsed={handleParsed} />
              {parsedData && <ParsedDeadlinesPreview parsed={parsedData} isCash={form.is_cash_transaction} />}
            </>
          ) : (
            <AgencyDocUpload docType="buyer_agency" onParsed={(data) => {
              const u = {};
              if (data.buyer_names) { u.buyer = data.buyer_names; setBuyers([data.buyer_names]); }
              if (data.firm_name) u.buyer_brokerage = data.firm_name;
              if (data.designated_agent) u.buyers_agent_name = data.designated_agent;
              if (data.agreement_start_date) u.contract_date = data.agreement_start_date;
              setForm(p => ({ ...p, ...u }));
            }} />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Property */}
            <Section label="Property">
              <F label="Property Address *" id="address">
                <Input id="address" value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, State" required className="mt-1.5" />
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F label="MLS Number" id="mls_number">
                  <Input id="mls_number" value={form.mls_number || ""} onChange={(e) => set("mls_number", e.target.value)} placeholder="MLS#" className="mt-1.5" />
                </F>
                <F label={isListing ? "List Price" : "Sale Price"} id="sale_price">
                  <Input id="sale_price" type="number" value={form.sale_price || ""} onChange={(e) => set("sale_price", e.target.value)} placeholder="e.g. 600000" className="mt-1.5" />
                </F>
                <F label="Commission" id="commission">
                  <Input id="commission" value={form.commission || ""} onChange={(e) => set("commission", e.target.value)} placeholder="5% or $15,000" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Buyer side — only for purchase */}
            {!isListing && (
              <>
                <Section label="Buyer Side">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Buyer Name(s) *</Label>
                    {buyers.map((b, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={b} onChange={(e) => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }}
                          placeholder={i === 0 ? "John Smith" : "Additional buyer"} required={i === 0} className="flex-1" />
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
                      <Input id="buyers_agent_name" value={form.buyers_agent_name || ""} onChange={(e) => set("buyers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" />
                    </F>
                    <F label="Buyer Brokerage" id="buyer_brokerage">
                      <Input id="buyer_brokerage" value={form.buyer_brokerage || ""} onChange={(e) => set("buyer_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" />
                    </F>
                  </div>
                </Section>
                <Separator />
              </>
            )}

            {/* Seller side */}
            <Section label="Seller Side">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Seller Name(s) *</Label>
                {sellers.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input value={s} onChange={(e) => { const n = [...sellers]; n[i] = e.target.value; setSellers(n); }}
                      placeholder={i === 0 ? "Robert Doe" : "Additional seller"} required={i === 0} className="flex-1" />
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
                  <Input id="sellers_agent_name" value={form.sellers_agent_name || ""} onChange={(e) => set("sellers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" />
                </F>
                <F label="Seller Brokerage" id="seller_brokerage">
                  <Input id="seller_brokerage" value={form.seller_brokerage || ""} onChange={(e) => set("seller_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Coordinator & Title */}
            <Section label="Coordinator &amp; Title">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Transaction Coordinator *" id="agent">
                  <Input id="agent" value={form.agent || ""} onChange={(e) => set("agent", e.target.value)} placeholder="TC Name" required className="mt-1.5" />
                </F>
                <F label="TC Email *" id="agent_email">
                  <Input id="agent_email" type="email" value={form.agent_email || ""} onChange={(e) => set("agent_email", e.target.value)} placeholder="tc@office.com" required className="mt-1.5" />
                </F>
                {!isListing && (
                  <F label="Closing / Title Company" id="closing_title_company">
                    <Input id="closing_title_company" value={form.closing_title_company || ""} onChange={(e) => set("closing_title_company", e.target.value)} placeholder="NH Title & Escrow" className="mt-1.5" />
                  </F>
                )}
              </div>
            </Section>

            <Separator />

            {/* Client Contact */}
            <Section label="Client Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Client Email (gets portal invite)" id="client_email">
                  <Input id="client_email" type="email" value={form.client_email || ""} onChange={(e) => set("client_email", e.target.value)} placeholder="client@email.com" className="mt-1.5" />
                </F>
                <F label="Client Phone" id="client_phone">
                  <Input id="client_phone" type="tel" value={form.client_phone || ""} onChange={(e) => set("client_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
                </F>
              </div>
            </Section>

            <Separator />

            {/* Listing Dates */}
            {isListing && (
              <Section label="Listing Dates">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Listing Start Date" id="contract_date">
                    <Input id="contract_date" type="date" value={form.contract_date || ""} onChange={(e) => set("contract_date", e.target.value)} className="mt-1.5" />
                  </F>
                  <F label="Listing Expiration Date" id="closing_date">
                    <Input id="closing_date" type="date" value={form.closing_date || ""} onChange={(e) => set("closing_date", e.target.value)} className="mt-1.5" />
                  </F>
                </div>
              </Section>
            )}

            {/* Purchase Deadlines */}
            {!isListing && (
              <>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Cash Transaction</p>
                    <p className="text-xs text-gray-400">No financing required</p>
                  </div>
                  <Switch checked={form.is_cash_transaction || false} onCheckedChange={(v) => set("is_cash_transaction", v)} />
                </div>
                <Section label="Key Dates &amp; Deadlines">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Contract / Effective Date" id="contract_date">
                      <Input id="contract_date" type="date" value={form.contract_date || ""} onChange={(e) => set("contract_date", e.target.value)} className="mt-1.5" />
                    </F>
                    <F label="Closing / Transfer of Title Date" id="closing_date">
                      <Input id="closing_date" type="date" value={form.closing_date || ""} onChange={(e) => set("closing_date", e.target.value)} className="mt-1.5" />
                    </F>
                    <F label="Earnest Money Deadline" id="earnest_money_deadline">
                      <Input id="earnest_money_deadline" type="date" value={form.earnest_money_deadline || ""} onChange={(e) => set("earnest_money_deadline", e.target.value)} className="mt-1.5" />
                    </F>
                    <F label="Inspection Deadline" id="inspection_deadline">
                      <Input id="inspection_deadline" type="date" value={form.inspection_deadline || ""} onChange={(e) => set("inspection_deadline", e.target.value)} className="mt-1.5" />
                    </F>
                    <F label="Due Diligence Deadline" id="due_diligence_deadline">
                      <Input id="due_diligence_deadline" type="date" value={form.due_diligence_deadline || ""} onChange={(e) => set("due_diligence_deadline", e.target.value)} className="mt-1.5" />
                    </F>
                    {!form.is_cash_transaction && (
                      <F label="Financing Commitment Date" id="financing_deadline">
                        <Input id="financing_deadline" type="date" value={form.financing_deadline || ""} onChange={(e) => set("financing_deadline", e.target.value)} className="mt-1.5" />
                      </F>
                    )}
                  </div>
                </Section>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 px-8">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {isListing ? "Create Listing" : "Submit to TC"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AgencyDocUpload({ docType, onParsed }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = React.useRef();

  const isListing = docType === "listing";
  const fnName = isListing ? "parseListingAgreement" : "parseBuyerAgencyAgreement";
  const label = isListing ? "Listing Agreement" : "Buyer Agency Agreement";

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setErrorMsg("");
    setStatus("uploading");
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setStatus("parsing");
    const res = await base44.functions.invoke(fnName, { file_url });
    const data = res?.data;
    if (!data || data.error) {
      setErrorMsg(data?.error || "Parsing failed. Please try again.");
      setStatus("error");
      return;
    }
    setStatus("done");
    onParsed(data);
  };

  const reset = () => { setFile(null); setStatus("idle"); setErrorMsg(""); };

  return (
    <div className="space-y-3">
      {!file && (
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Upload {label}</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, image scans, or DOCX — click to browse</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            <Zap className="w-3 h-3" /> AI auto-extracts key fields
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}
      {file && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {(status === "uploading" || status === "parsing") && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />}
          {status === "done" && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          {status === "idle" && <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
      )}
      {status === "uploading" && <p className="text-xs text-indigo-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>}
      {status === "parsing" && <p className="text-xs text-indigo-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI extracting fields from {label}...</p>}
      {status === "done" && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {label} parsed — fields auto-filled below.</p>}
      {status === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
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