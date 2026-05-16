import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Send, CheckCircle, FileSearch, Plus, X, Upload,
  FileText, Zap, Home, FileSignature, UserCheck, AlertTriangle, ArrowLeft,
} from "lucide-react";
import ParsedDeadlinesPreview from "@/components/forms/ParsedDeadlinesPreview";
import InspectionContingencySection from "@/components/intake/InspectionContingencySection";
import ContractScannerLoader from "@/components/loaders/ContractScannerLoader";

const DEAL_TYPES = [
  { id: "buyer_uc",   label: "Buyer Under Contract",  desc: "You represent the buyer — PSA signed. Lender, inspections, appraisal tracked.", icon: UserCheck,     color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  { id: "seller_uc", label: "Seller Under Contract", desc: "You represent the seller — PSA signed. Buyer-side financing, inspections tracked.", icon: Home,        color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  { id: "listing",   label: "Listing Input",          desc: "You represent the seller — MLS input, photos, showings. No buyer or PSA yet.", icon: Home,           color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  { id: "both",      label: "Both (Dual)",             desc: "You represent both buyer and seller on the same transaction.",                 icon: FileSignature, color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
];

const initialBuyerUC = {
  agent: "", agent_email: "", agent_phone: "",
  buyers_agent_name: "", sellers_agent_name: "",
  buyer_brokerage: "", seller_brokerage: "",
  closing_title_company: "",
  lender_name: "", lender_email: "", lender_phone: "",
  address: "", mls_number: "", commission: "", sale_price: "",
  transaction_type: "buyer", is_cash_transaction: false, client_phone: "",
  contract_date: "", closing_date: "",
  earnest_money_deadline: "", inspection_deadline: "",
  due_diligence_deadline: "", financing_deadline: "",
};

const initialListing = {
  agent: "", agent_email: "", agent_phone: "",
  sellers_agent_name: "", seller_brokerage: "",
  address: "", mls_number: "", commission: "", sale_price: "", list_price: "",
  client_phone: "", contract_date: "", closing_date: "", transaction_type: "seller",
};

const initialBoth = {
  agent: "", agent_email: "", agent_phone: "",
  sellers_agent_name: "", seller_brokerage: "",
  buyers_agent_name: "", buyer_brokerage: "",
  closing_title_company: "",
  address: "", mls_number: "", commission: "", sale_price: "",
  transaction_type: "seller", is_cash_transaction: false, client_phone: "",
  contract_date: "", closing_date: "",
  earnest_money_deadline: "", inspection_deadline: "",
  due_diligence_deadline: "", financing_deadline: "",
};

const initialBuyerAgency = {
  agent: "", agent_email: "", agent_phone: "",
  buyers_agent_name: "", buyer_brokerage: "",
  commission: "", retainer_fee: "",
  designated_agency: false, dual_agency_consent: false,
  contract_date: "", agreement_expiration_deadline: "",
  transaction_type: "buyer", transaction_phase: "intake", client_phone: "",
};

function RequiredDocUpload({ docType, onUploaded, onParsed, required = true }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [fileUrl, setFileUrl] = useState(null);
  const inputRef = useRef();

  const isListing = docType === "listing";
  const isBuyerAgency = docType === "buyer_agency";
  const fnName = isListing ? "parseListingAgreement" : isBuyerAgency ? "parseBuyerAgencyAgreement" : "parsePurchaseAgreementV2";
  const label = isListing ? "Listing Agreement" : isBuyerAgency ? "Buyer Agency Agreement" : "Purchase & Sale Agreement";

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f); setStatus("uploading");
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setFileUrl(file_url);
    onUploaded(file_url, f.name);
    setStatus("parsing");
    try {
      const res = await base44.functions.invoke(fnName, { file_url });
      const data = res?.data;
      if (!data || data.error) { setStatus("done"); return; }
      setStatus("done");
      if (onParsed) onParsed(data);
    } catch { setStatus("done"); }
  };

  const reset = () => { setFile(null); setStatus("idle"); setFileUrl(null); onUploaded(null, null); };

  return (
    <div className="space-y-3">
      {!file && (
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors"
          style={{ borderColor: "rgba(210,163,95,0.3)", background: "rgba(210,163,95,0.04)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(210,163,95,0.6)"; e.currentTarget.style.background = "rgba(210,163,95,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(210,163,95,0.3)"; e.currentTarget.style.background = "rgba(210,163,95,0.04)"; }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(210,163,95,0.15)" }}>
            <Upload className="w-5 h-5" style={{ color: "#d2a35f" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Upload {label} {required && <span className="text-red-400">*</span>}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>PDF, image scans, or DOCX — click to browse</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border" style={{ color: "#d2a35f", borderColor: "rgba(210,163,95,0.3)", background: "rgba(210,163,95,0.08)" }}>
            <Zap className="w-3 h-3" /> AI auto-extracts key fields
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}
      {file && (
        <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: status === "done" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", borderColor: status === "done" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(210,163,95,0.1)" }}>
            <FileText className="w-4 h-4" style={{ color: "#d2a35f" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{file.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {(status === "uploading" || status === "parsing") && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#d2a35f" }} />}
          {status === "done" && <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#22c55e" }} />}
          <button onClick={reset} className="p-1" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}><X className="w-4 h-4" /></button>
        </div>
      )}
      {status === "parsing" && <div className="flex justify-center py-2"><ContractScannerLoader isLoading={true} /></div>}
      {status === "done" && fileUrl && <p className="text-xs flex items-center gap-1" style={{ color: "#22c55e" }}><CheckCircle className="w-3 h-3" /> Document uploaded — fields auto-filled.</p>}
    </div>
  );
}

function Section({ label, children }) {
  return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>{children}</div>;
}

function F({ label, id, children }) {
  return <div><Label htmlFor={id} className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</Label>{children}</div>;
}

function AgentContactSection({ form, set }) {
  return (
    <Section label="Agent Contact">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="Agent / TC Name *" id="m_agent_name">
          <Input id="m_agent_name" value={form.agent || ""} onChange={e => set("agent", e.target.value)} placeholder="Full name" required className="mt-1.5" />
        </F>
        <F label="Agent Email *" id="m_agent_email">
          <Input id="m_agent_email" type="email" value={form.agent_email || ""} onChange={e => set("agent_email", e.target.value)} placeholder="agent@brokerage.com" required className="mt-1.5" />
        </F>
        <F label="Agent Phone *" id="m_agent_phone">
          <Input id="m_agent_phone" type="tel" value={form.agent_phone || ""} onChange={e => set("agent_phone", e.target.value)} placeholder="(555) 123-4567" required className="mt-1.5" />
        </F>
      </div>
    </Section>
  );
}

function ClientContactSection({ clientEmails, setClientEmails, clientPhones, setClientPhones }) {
  return (
    <Section label="Client Contact">
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Client Email(s)</Label>
        {clientEmails.map((email, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input type="email" value={email} onChange={e => { const n = [...clientEmails]; n[i] = e.target.value; setClientEmails(n); }} placeholder={i === 0 ? "client@email.com" : "Additional email"} className="flex-1" />
            {clientEmails.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setClientEmails(clientEmails.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setClientEmails([...clientEmails, ""])}><Plus className="w-3 h-3 mr-1" /> Add Email</Button>
      </div>
      <div className="space-y-2 mt-3">
        <Label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Client Phone(s)</Label>
        {clientPhones.map((phone, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input type="tel" value={phone} onChange={e => { const n = [...clientPhones]; n[i] = e.target.value; setClientPhones(n); }} placeholder={i === 0 ? "(555) 123-4567" : "Additional phone"} className="flex-1" />
            {clientPhones.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setClientPhones(clientPhones.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setClientPhones([...clientPhones, ""])}><Plus className="w-3 h-3 mr-1" /> Add Phone</Button>
      </div>
    </Section>
  );
}

export default function NewTransactionModal({ open, onClose, onCreated }) {
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me(), retry: false });
  const navigate = useNavigate();

  const [dealType, setDealType] = useState(null);
  const [docType, setDocType] = useState("ps");
  const [form, setForm] = useState({});
  const [buyers, setBuyers] = useState([""]);
  const [sellers, setSellers] = useState([""]);
  const [clientEmails, setClientEmails] = useState([""]);
  const [clientPhones, setClientPhones] = useState([""]);
  const [parsedData, setParsedData] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentName, setDocumentName] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Reset on close
  const handleClose = () => {
    setDealType(null); setForm({}); setBuyers([""]); setSellers([""]); setClientEmails([""]); setClientPhones([""]); setParsedData(null); setDocumentUrl(null); setDocumentName(null); setSubmitError(""); setSubmitting(false);
    onClose();
  };

  const selectDealType = (type) => {
    setDealType(type); setDocType("ps"); setParsedData(null); setDocumentUrl(null); setDocumentName(null);
    setBuyers([""]); setSellers([""]); setClientEmails([""]); setClientPhones([""]);
    if (type === "listing") setForm({ ...initialListing });
    else if (type === "both") setForm({ ...initialBoth });
    else if (type === "seller_uc") setForm({ ...initialBuyerUC, transaction_type: "seller" });
    else setForm({ ...initialBuyerUC });
  };

  const handleDocTypeChange = (newDocType) => {
    setDocType(newDocType); setParsedData(null); setDocumentUrl(null); setDocumentName(null);
    if (newDocType === "buyer_agency") {
      setForm({ ...initialBuyerAgency, agent: form.agent || "", agent_email: form.agent_email || "", agent_phone: form.agent_phone || "" });
      setBuyers([""]);
    } else {
      setForm({ ...initialBuyerUC, agent: form.agent || "", agent_email: form.agent_email || "", agent_phone: form.agent_phone || "" });
      setBuyers([""]);
    }
  };

  const handleParsed = (parsed) => {
    setParsedData(parsed);
    const u = {};
    const acceptanceDate = parsed.acceptance_date || parsed.effectiveDate || null;
    if (acceptanceDate) u.contract_date = acceptanceDate;
    if (parsed.closing_date || parsed.closingDate) u.closing_date = parsed.closing_date || parsed.closingDate;
    if (parsed.property_address || parsed.propertyAddress) u.address = parsed.property_address || parsed.propertyAddress;
    const buyerVal = parsed.buyer_names || parsed.buyer || parsed.buyerName || null;
    if (buyerVal) { u.buyer = buyerVal; setBuyers([buyerVal]); }
    const sellerVal = parsed.seller_names || parsed.seller || parsed.sellerName || null;
    if (sellerVal) { u.seller = sellerVal; setSellers([sellerVal]); }
    if (parsed.buyer_agent || parsed.buyers_agent_name) u.buyers_agent_name = parsed.buyer_agent || parsed.buyers_agent_name;
    if (parsed.seller_agent || parsed.sellers_agent_name) u.sellers_agent_name = parsed.seller_agent || parsed.sellers_agent_name;
    if (parsed.buyer_brokerage || parsed.buyerBrokerage) u.buyer_brokerage = parsed.buyer_brokerage || parsed.buyerBrokerage;
    if (parsed.seller_brokerage || parsed.sellerBrokerage) u.seller_brokerage = parsed.seller_brokerage || parsed.sellerBrokerage;
    const titleCo = parsed.title_company !== "null" ? (parsed.title_company || parsed.closing_title_company || null) : (parsed.closing_title_company || null);
    if (titleCo) u.closing_title_company = titleCo;
    if (parsed.financing_commitment_date) u.financing_deadline = parsed.financing_commitment_date;
    if (parsed.inspection_deadline) u.inspection_deadline = (parsed.inspection_deadline || "").split("T")[0];
    if (parsed.earnest_money_deadline) u.earnest_money_deadline = parsed.earnest_money_deadline;
    if (parsed.due_diligence_deadline) u.due_diligence_deadline = parsed.due_diligence_deadline;
    const priceVal = parsed.purchase_price || parsed.price || null;
    if (priceVal) u.sale_price = String(priceVal);
    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    setForm(p => ({ ...p, ...u }));
  };

  const handleListingParsed = (data) => {
    const u = {};
    if (data.seller_names) { u.seller = data.seller_names; setSellers([data.seller_names]); }
    if (data.property_address) u.address = data.property_address;
    if (data.list_price) u.sale_price = String(data.list_price);
    if (data.firm_name) u.seller_brokerage = data.firm_name;
    if (data.designated_agent) u.sellers_agent_name = data.designated_agent;
    if (data.listing_start_date) u.contract_date = data.listing_start_date;
    if (data.listing_expiration_date) u.closing_date = data.listing_expiration_date;
    if (data.listing_commission_percent) u.commission = `${data.listing_commission_percent}%`;
    setForm(p => ({ ...p, ...u }));
  };

  const handleBuyerAgencyParsed = (data) => {
    const u = {};
    if (data.buyer_names) { u.buyer = data.buyer_names; setBuyers([data.buyer_names]); }
    if (data.firm_name) u.buyer_brokerage = data.firm_name;
    if (data.designated_agent) u.buyers_agent_name = data.designated_agent;
    if (data.agreement_start_date) u.contract_date = data.agreement_start_date;
    if (data.agreement_expiration_date || data.expiration_date) u.agreement_expiration_deadline = data.agreement_expiration_date || data.expiration_date;
    if (data.compensation) u.commission = data.compensation;
    setForm(p => ({ ...p, ...u }));
  };

  const isBuyerUC = dealType === "buyer_uc";
  const isSellerUC = dealType === "seller_uc";
  const isListing = dealType === "listing";
  const isBoth = dealType === "both";
  const isBuyerAgency = isBuyerUC && docType === "buyer_agency";
  const isUnderContract = (isBoth || isBuyerUC || isSellerUC) && !isBuyerAgency;
  const dealConfig = DEAL_TYPES.find(d => d.id === dealType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const cleanClientEmails = clientEmails.filter(Boolean);
      const cleanClientPhones = clientPhones.filter(Boolean);
      const buyerList = buyers.filter(Boolean);
      const sellerList = sellers.filter(Boolean);

      const txPayload = {
        ...form,
        address: isBuyerAgency ? "Pre-Transaction — Buyer Representation" : (form.address || ""),
        agent: form.agent || currentUser?.full_name || currentUser?.email || "",
        agent_email: form.agent_email || currentUser?.email || "",
        agent_phone: form.agent_phone || form.client_phone || "",
        buyers: buyerList,
        sellers: sellerList,
        buyer: buyerList[0] || "",
        seller: sellerList[0] || "",
        client_emails: cleanClientEmails,
        client_email: cleanClientEmails[0] || "",
        client_phones: cleanClientPhones,
        sale_price: form.sale_price ? Number(form.sale_price) : undefined,
        is_cash_transaction: form.is_cash_transaction || false,
        transaction_type: form.transaction_type || (isSellerUC ? "seller" : isListing ? "seller" : "buyer"),
        status: "active",
        document_url: documentUrl || undefined,
        document_name: documentName || undefined,
        inspection_deadline: form.inspections_waived ? null : form.inspection_deadline,
      };

      const tx = await base44.entities.Transaction.create(txPayload);
      if (!tx?.id) throw new Error("Transaction was not created. Please try again.");
      handleClose();
      if (onCreated) onCreated(tx);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 860,
          maxHeight: "90vh",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          animation: "ntm-in 0.2s ease",
        }}
      >
        <style>{`@keyframes ntm-in { from { opacity:0; transform: scale(0.96) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {dealType && (
              <button onClick={() => setDealType(null)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', serif" }}>
                {!dealType ? "New Transaction" : (isBuyerAgency ? "Buyer Representation Agreement" : dealConfig?.label)}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {!dealType ? "Select the transaction type to get started" : "Fill in the details below — upload a contract to auto-fill fields"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>

          {/* Step 1: Deal type selection */}
          {!dealType && (
            <div className="grid grid-cols-1 gap-3">
              {DEAL_TYPES.map(({ id, label, desc, icon: Icon, color, bg }) => (
                <button key={id} onClick={() => selectDealType(id)}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = bg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Form */}
          {dealType && (
            <div className="space-y-5">
              {/* Document Upload */}
              <div className="rounded-xl border p-4" style={{ borderColor: "rgba(210,163,95,0.15)", background: "rgba(210,163,95,0.04)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4" style={{ color: "#d2a35f" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Upload Agreement <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional — AI auto-fills fields)</span>
                    </span>
                  </div>
                  {isBuyerUC && (
                    <div className="flex gap-0.5 p-0.5 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                      <button type="button" onClick={() => handleDocTypeChange("ps")}
                        className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{ background: docType === "ps" ? "#d2a35f" : "transparent", color: docType === "ps" ? "#050506" : "var(--text-muted)" }}>
                        Purchase &amp; Sale
                      </button>
                      <button type="button" onClick={() => handleDocTypeChange("buyer_agency")}
                        className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{ background: docType === "buyer_agency" ? "#d2a35f" : "transparent", color: docType === "buyer_agency" ? "#050506" : "var(--text-muted)" }}>
                        Buyer Agency
                      </button>
                    </div>
                  )}
                </div>
                {isListing ? (
                  <RequiredDocUpload docType="listing" required={false}
                    onUploaded={(url, name) => { setDocumentUrl(url); setDocumentName(name); }}
                    onParsed={handleListingParsed} />
                ) : isBuyerAgency ? (
                  <RequiredDocUpload docType="buyer_agency" required={false}
                    onUploaded={(url, name) => { setDocumentUrl(url); setDocumentName(name); }}
                    onParsed={handleBuyerAgencyParsed} />
                ) : (
                  <>
                    <RequiredDocUpload docType="ps" required={true}
                      onUploaded={(url, name) => { setDocumentUrl(url); setDocumentName(name); }}
                      onParsed={handleParsed} />
                    {parsedData && <div className="mt-3"><ParsedDeadlinesPreview parsed={parsedData} isCash={form.is_cash_transaction} /></div>}
                  </>
                )}
              </div>

              {/* Main form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

                {isBuyerAgency ? (
                  <>
                    <Section label="Buyer Information">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Buyer Name(s) *</Label>
                        {buyers.map((b, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input value={b} onChange={e => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }} placeholder={i === 0 ? "John Smith" : "Additional buyer"} required={i === 0} className="flex-1" />
                            {buyers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setBuyers([...buyers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Buyer</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <F label="Buyer Agent Name" id="m_ba_name"><Input id="m_ba_name" value={form.buyers_agent_name || ""} onChange={e => set("buyers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" /></F>
                        <F label="Buyer Brokerage" id="m_ba_brk"><Input id="m_ba_brk" value={form.buyer_brokerage || ""} onChange={e => set("buyer_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" /></F>
                      </div>
                    </Section>
                    <Separator />
                    <Section label="Agreement Dates">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Start Date *" id="m_ba_start"><Input id="m_ba_start" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} required className="mt-1.5" /></F>
                        <F label="Expiration Date *" id="m_ba_exp"><Input id="m_ba_exp" type="date" value={form.agreement_expiration_deadline || ""} onChange={e => set("agreement_expiration_deadline", e.target.value)} required className="mt-1.5" /></F>
                      </div>
                    </Section>
                    <Separator />
                    <Section label="Compensation">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Compensation" id="m_ba_comp"><Input id="m_ba_comp" value={form.commission || ""} onChange={e => set("commission", e.target.value)} placeholder="e.g. 2.5% or $5,000" className="mt-1.5" /></F>
                        <F label="Retainer Fee" id="m_ba_ret"><Input id="m_ba_ret" value={form.retainer_fee || ""} onChange={e => set("retainer_fee", e.target.value)} placeholder="e.g. $500" className="mt-1.5" /></F>
                      </div>
                    </Section>
                    <Separator />
                    <AgentContactSection form={form} set={set} />
                    <Separator />
                    <ClientContactSection clientEmails={clientEmails} setClientEmails={setClientEmails} clientPhones={clientPhones} setClientPhones={setClientPhones} />
                  </>
                ) : (
                  <>
                    <Section label="Property">
                      <F label="Property Address *" id="m_addr"><Input id="m_addr" value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="123 Main St, City, State" required className="mt-1.5" /></F>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <F label="MLS Number" id="m_mls"><Input id="m_mls" value={form.mls_number || ""} onChange={e => set("mls_number", e.target.value)} placeholder="MLS#" className="mt-1.5" /></F>
                        <F label={isListing ? "List Price" : "Sale Price"} id="m_price"><Input id="m_price" type="number" value={form.sale_price || ""} onChange={e => set("sale_price", e.target.value)} placeholder="e.g. 600000" className="mt-1.5" /></F>
                        <F label="Commission" id="m_comm"><Input id="m_comm" value={form.commission || ""} onChange={e => set("commission", e.target.value)} placeholder="5% or $15,000" className="mt-1.5" /></F>
                        <F label="Year Built" id="m_yr">
                          <Input id="m_yr" type="number" min="1600" max={new Date().getFullYear()} value={form.year_built || ""} onChange={e => set("year_built", e.target.value ? parseInt(e.target.value, 10) : "")} placeholder="e.g. 1985" className="mt-1.5" />
                          {form.year_built && Number(form.year_built) <= 1978 && (
                            <p className="mt-1.5 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1.5" style={{ color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}>
                              ⚠ Lead Paint Disclosure required (pre-1978)
                            </p>
                          )}
                        </F>
                      </div>
                    </Section>
                    <Separator />
                    {isBuyerUC && (
                      <>
                        <Section label="Buyer Side">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Buyer Name(s) *</Label>
                            {buyers.map((b, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <Input value={b} onChange={e => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }} placeholder={i === 0 ? "John Smith" : "Additional buyer"} required={i === 0} className="flex-1" />
                                {buyers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setBuyers([...buyers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Buyer</Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <F label="Buyer's Agent" id="m_ba"><Input id="m_ba" value={form.buyers_agent_name || ""} onChange={e => set("buyers_agent_name", e.target.value)} placeholder="Agent name" className="mt-1.5" /></F>
                            <F label="Buyer Brokerage" id="m_bbrk"><Input id="m_bbrk" value={form.buyer_brokerage || ""} onChange={e => set("buyer_brokerage", e.target.value)} placeholder="Brokerage" className="mt-1.5" /></F>
                          </div>
                        </Section>
                        <Separator />
                      </>
                    )}
                    <Section label="Seller Side">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Seller Name(s) *</Label>
                        {sellers.map((s, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input value={s} onChange={e => { const n = [...sellers]; n[i] = e.target.value; setSellers(n); }} placeholder={i === 0 ? "Robert Doe" : "Additional seller"} required={i === 0} className="flex-1" />
                            {sellers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSellers(sellers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setSellers([...sellers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Seller</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <F label="Seller's Agent" id="m_sa"><Input id="m_sa" value={form.sellers_agent_name || ""} onChange={e => set("sellers_agent_name", e.target.value)} placeholder="Agent name" className="mt-1.5" /></F>
                        <F label="Seller Brokerage" id="m_sbrk"><Input id="m_sbrk" value={form.seller_brokerage || ""} onChange={e => set("seller_brokerage", e.target.value)} placeholder="Brokerage" className="mt-1.5" /></F>
                      </div>
                    </Section>
                    <Separator />
                    <Section label="Coordinator & Title">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Transaction Coordinator *" id="m_tc"><Input id="m_tc" value={form.agent || ""} onChange={e => set("agent", e.target.value)} placeholder="TC Name" required className="mt-1.5" /></F>
                        <F label="TC Email *" id="m_tce"><Input id="m_tce" type="email" value={form.agent_email || ""} onChange={e => set("agent_email", e.target.value)} placeholder="tc@office.com" required className="mt-1.5" /></F>
                        {isUnderContract && (
                          <F label="Closing / Title Company" id="m_title"><Input id="m_title" value={form.closing_title_company || ""} onChange={e => set("closing_title_company", e.target.value)} placeholder="NH Title & Escrow" className="mt-1.5" /></F>
                        )}
                      </div>
                    </Section>
                    <Separator />
                    <ClientContactSection clientEmails={clientEmails} setClientEmails={setClientEmails} clientPhones={clientPhones} setClientPhones={setClientPhones} />
                    {isListing && (
                      <>
                        <Separator />
                        <Section label="Listing Dates">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <F label="Listing Start Date" id="m_ls"><Input id="m_ls" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} className="mt-1.5" /></F>
                            <F label="Listing Expiration" id="m_le"><Input id="m_le" type="date" value={form.closing_date || ""} onChange={e => set("closing_date", e.target.value)} className="mt-1.5" /></F>
                          </div>
                        </Section>
                      </>
                    )}
                    {isBuyerUC && (
                      <>
                        <Separator />
                        <Section label="Lender">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <F label="Lender Name" id="m_ln"><Input id="m_ln" value={form.lender_name || ""} onChange={e => set("lender_name", e.target.value)} placeholder="Jane Smith" className="mt-1.5" /></F>
                            <F label="Lender Email" id="m_le2"><Input id="m_le2" type="email" value={form.lender_email || ""} onChange={e => set("lender_email", e.target.value)} placeholder="lender@bank.com" className="mt-1.5" /></F>
                            <F label="Lender Phone" id="m_lp"><Input id="m_lp" type="tel" value={form.lender_phone || ""} onChange={e => set("lender_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" /></F>
                          </div>
                        </Section>
                      </>
                    )}
                    {isUnderContract && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Cash Transaction</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No financing required</p>
                          </div>
                          <Switch checked={form.is_cash_transaction || false} onCheckedChange={v => set("is_cash_transaction", v)} />
                        </div>
                        <Section label="Key Dates & Deadlines">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <F label="Contract / Effective Date" id="m_cd"><Input id="m_cd" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} className="mt-1.5" /></F>
                            <F label="Closing Date" id="m_cl"><Input id="m_cl" type="date" value={form.closing_date || ""} onChange={e => set("closing_date", e.target.value)} className="mt-1.5" /></F>
                            <F label="Earnest Money Deadline" id="m_em"><Input id="m_em" type="date" value={form.earnest_money_deadline || ""} onChange={e => set("earnest_money_deadline", e.target.value)} className="mt-1.5" /></F>
                            {!form.inspections_waived && (
                              <F label="Inspection Deadline" id="m_insp"><Input id="m_insp" type="date" value={form.inspection_deadline || ""} onChange={e => set("inspection_deadline", e.target.value)} className="mt-1.5" /></F>
                            )}
                            <F label="Due Diligence Deadline" id="m_dd"><Input id="m_dd" type="date" value={form.due_diligence_deadline || ""} onChange={e => set("due_diligence_deadline", e.target.value)} className="mt-1.5" /></F>
                            {!form.is_cash_transaction && (
                              <F label="Financing Commitment Date" id="m_fin"><Input id="m_fin" type="date" value={form.financing_deadline || ""} onChange={e => set("financing_deadline", e.target.value)} className="mt-1.5" /></F>
                            )}
                          </div>
                        </Section>
                        <Separator />
                        <InspectionContingencySection form={form} set={set} />
                      </>
                    )}
                    {!isBuyerAgency && (
                      <>
                        <Separator />
                        <AgentContactSection form={form} set={set} />
                      </>
                    )}
                  </>
                )}

                {submitError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border text-sm" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 pb-2">
                  <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="px-8 gap-2" style={{ background: "#d2a35f", color: "#050506" }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isListing ? "Create Listing" : isBoth ? "Create Dual Transaction" : isBuyerAgency ? "Create Representation" : isSellerUC ? "Create Seller Transaction" : "Create Transaction"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}