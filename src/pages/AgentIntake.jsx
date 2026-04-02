import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Send, CheckCircle, FileSearch, Plus, X, Upload,
  FileText, Zap, Home, FileSignature, UserCheck, ShieldCheck, Mail, Phone,
  ClipboardList, AlertTriangle,
} from "lucide-react";
import { generateSmartTasks } from "../components/transactions/defaultTasks";
import PurchaseAgreementUpload from "../components/forms/PurchaseAgreementUpload";
import ParsedDeadlinesPreview from "../components/forms/ParsedDeadlinesPreview";
import { generateTasksForPhase } from "../lib/taskLibrary";
import IntakePendingReviews from "../components/intake/IntakePendingReviews";

// ── Deal Type Config ──────────────────────────────────────────────────────────

const DEAL_TYPES = [
  { id: "buyer_uc",    label: "Buyer Under Contract",  desc: "You represent the buyer — PSA signed. Lender, inspections, appraisal tracked.", icon: UserCheck,      color: "#2563eb", bg: "#eff6ff" },
  { id: "seller_uc",  label: "Seller Under Contract", desc: "You represent the seller — PSA signed. Buyer-side financing, inspections tracked.", icon: Home,         color: "#16a34a", bg: "#f0fdf4" },
  { id: "listing",    label: "Listing Input",          desc: "You represent the seller — MLS input, photos, showings. No buyer or PSA yet.", icon: Home,            color: "#d97706", bg: "#fef3c7" },
  { id: "both",       label: "Both (Dual)",            desc: "You represent both buyer and seller on the same transaction.",                  icon: FileSignature,  color: "#7c3aed", bg: "#f5f3ff" },
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

// ── OTP Verification Component ────────────────────────────────────────────────

function OTPVerification({ email, onVerified }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const sendOTP = async () => {
    if (!email) { setError("Email is required."); return; }
    setSending(true); setError("");
    try {
      const res = await base44.functions.invoke("sendOTP", { action: "send", email });
      if (res.data?.error) throw new Error(res.data.error);
      setSent(true);
      setCooldown(60);
      const iv = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
    } catch (e) { setError(e.message || "Failed to send code."); }
    setSending(false);
  };

  const verifyOTP = async () => {
    if (!code.trim()) { setError("Enter the 6-digit code."); return; }
    setVerifying(true); setError("");
    try {
      const res = await base44.functions.invoke("sendOTP", { action: "verify", email, code });
      if (res.data?.error) throw new Error(res.data.error);
      onVerified();
    } catch (e) { setError(e.message || "Verification failed."); }
    setVerifying(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        We'll send a 6-digit verification code to <strong>{email}</strong>
      </div>

      {!sent ? (
        <Button onClick={sendOTP} disabled={sending || !email} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Send Verification Code
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700">Enter 6-digit code *</Label>
            <Input
              className="mt-1.5 text-center font-mono text-xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && verifyOTP()}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={verifyOTP} disabled={verifying || code.length < 6} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2">
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify
            </Button>
            <Button variant="outline" onClick={sendOTP} disabled={sending || cooldown > 0} className="flex-shrink-0 text-xs">
              {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// ── Document Upload (required) ────────────────────────────────────────────────

function RequiredDocUpload({ docType, onUploaded, onParsed, required = true }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | done | error
  const [fileUrl, setFileUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();

  const isListing = docType === "listing";
  const isBuyerAgency = docType === "buyer_agency";
  const fnName = isListing ? "parseListingAgreement" : isBuyerAgency ? "parseBuyerAgencyAgreement" : "parsePurchaseAgreementV2";
  const label = isListing ? "Listing Agreement" : isBuyerAgency ? "Buyer Agency Agreement" : "Purchase & Sale Agreement";

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f); setErrorMsg(""); setStatus("uploading");
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setFileUrl(file_url);
    onUploaded(file_url, f.name);
    setStatus("parsing");
    try {
      const res = await base44.functions.invoke(fnName, { file_url });
      const data = res?.data;
      if (!data || data.error) { setStatus("done"); return; } // parse fail is non-blocking
      setStatus("done");
      if (onParsed) onParsed(data);
    } catch { setStatus("done"); }
  };

  const reset = () => { setFile(null); setStatus("idle"); setErrorMsg(""); setFileUrl(null); onUploaded(null, null); };

  return (
    <div className="space-y-3">
      {!file && (
        <div onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${required ? "border-blue-300 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-indigo-300"}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${required ? "bg-blue-100" : "bg-indigo-100"}`}>
            <Upload className={`w-6 h-6 ${required ? "text-blue-500" : "text-indigo-500"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Upload {label} {required && <span className="text-red-500">*</span>}</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, image scans, or DOCX — click to browse</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <Zap className="w-3 h-3" /> AI auto-extracts key fields
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}
      {file && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status === "done" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {(status === "uploading" || status === "parsing") && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {status === "done" && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          <button onClick={reset} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
        </div>
      )}
      {status === "uploading" && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</p>}
      {status === "parsing" && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI reading {label}…</p>}
      {status === "done" && fileUrl && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Document uploaded — fields auto-filled.</p>}
      {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }) {
  return <div className="space-y-3"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>{children}</div>;
}

function F({ label, id, children }) {
  return <div><Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>{children}</div>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentIntake() {
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me(), retry: false });

  // Internal TC view — show pending reviews
  const isTC = currentUser && ["tc", "tc_lead", "admin", "owner"].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState("submit"); // "submit" | "review"
  const [dealType, setDealType] = useState(null);
  const [docType, setDocType] = useState("ps");
  const [form, setForm] = useState({});
  const [buyers, setBuyers] = useState([""]);
  const [sellers, setSellers] = useState([""]);
  const [clientEmails, setClientEmails] = useState([""]);
  const [parsedData, setParsedData] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentName, setDocumentName] = useState(null);

  // Security state
  const [emailVerified, setEmailVerified] = useState(false);
  const [showOTP, setShowOTP] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const selectDealType = (type) => {
    setDealType(type); setDocType("ps"); setParsedData(null);
    setDocumentUrl(null); setDocumentName(null);
    setEmailVerified(false); setShowOTP(false);
    setBuyers([""]); setSellers([""]); setClientEmails([""]);
    if (type === "listing") setForm({ ...initialListing });
    else if (type === "both") setForm({ ...initialBoth });
    else if (type === "seller_uc") setForm({ ...initialBuyerUC, transaction_type: "seller" });
    else setForm({ ...initialBuyerUC });
  };

  const handleDocTypeChange = (newDocType) => {
    setDocType(newDocType); setParsedData(null);
    setDocumentUrl(null); setDocumentName(null);
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
    if (parsed.effectiveDate)        u.contract_date = parsed.effectiveDate;
    if (parsed.closingDate)          u.closing_date = parsed.closingDate;
    if (parsed.propertyAddress)      u.address = parsed.propertyAddress;
    if (parsed.buyerName)            { u.buyer = parsed.buyerName; setBuyers([parsed.buyerName]); }
    if (parsed.sellerName)           { u.seller = parsed.sellerName; setSellers([parsed.sellerName]); }
    if (parsed.buyersAgentName)      u.buyers_agent_name = parsed.buyersAgentName;
    if (parsed.sellersAgentName)     u.sellers_agent_name = parsed.sellersAgentName;
    if (parsed.buyerBrokerage)       u.buyer_brokerage = parsed.buyerBrokerage;
    if (parsed.sellerBrokerage)      u.seller_brokerage = parsed.sellerBrokerage;
    if (parsed.closingTitleCompany)  u.closing_title_company = parsed.closingTitleCompany;
    if (parsed.financingCommitmentDate) u.financing_deadline = parsed.financingCommitmentDate;
    if (parsed.inspectionDeadline)   u.inspection_deadline = parsed.inspectionDeadline;
    if (parsed.earnestMoneyDeadline) u.earnest_money_deadline = parsed.earnestMoneyDeadline;
    if (parsed.dueDiligenceDeadline) u.due_diligence_deadline = parsed.dueDiligenceDeadline;
    if (parsed.purchasePrice)        u.sale_price = String(parsed.purchasePrice);
    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    setForm(p => ({ ...p, ...u }));
  };

  const handleBuyerAgencyParsed = (data) => {
    const u = {};
    if (data.buyer_names)            { u.buyer = data.buyer_names; setBuyers([data.buyer_names]); }
    if (data.firm_name)              u.buyer_brokerage = data.firm_name;
    if (data.designated_agent)       u.buyers_agent_name = data.designated_agent;
    if (data.agreement_start_date)   u.contract_date = data.agreement_start_date;
    if (data.agreement_expiration_date || data.expiration_date) u.agreement_expiration_deadline = data.agreement_expiration_date || data.expiration_date;
    if (data.compensation)           u.commission = data.compensation;
    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    setForm(p => ({ ...p, ...u }));
  };

  const handleListingParsed = (data) => {
    const u = {};
    if (data.seller_names)           { u.seller = data.seller_names; setSellers([data.seller_names]); }
    if (data.property_address)       u.address = data.property_address;
    if (data.list_price)             u.sale_price = String(data.list_price);
    if (data.firm_name)              u.seller_brokerage = data.firm_name;
    if (data.designated_agent)       u.sellers_agent_name = data.designated_agent;
    if (data.listing_start_date)     u.contract_date = data.listing_start_date;
    if (data.listing_expiration_date) u.closing_date = data.listing_expiration_date;
    if (data.listing_commission_percent) u.commission = `${data.listing_commission_percent}%`;
    setForm(p => ({ ...p, ...u }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const isBuyerAgency = dealType === "buyer_uc" && docType === "buyer_agency";
    const requiresDoc = !isBuyerAgency;

    // Guard: doc required
    if (requiresDoc && !documentUrl) {
      setSubmitError("Please upload the signed agreement document before submitting.");
      return;
    }
    // Guard: email must be verified
    if (!emailVerified) {
      setShowOTP(true);
      setSubmitError("Please verify your email before submitting.");
      return;
    }

    setSubmitting(true);
    const cleanClientEmails = clientEmails.filter(Boolean);
    const buyerList = buyers.filter(Boolean);
    const sellerList = sellers.filter(Boolean);

    try {
      const res = await base44.functions.invoke("submitIntake", {
        deal_type: isBuyerAgency ? "buyer_agency" : isSellerUC ? "seller_uc" : dealType,
        form_data: {
          ...form,
          sale_price: form.sale_price ? Number(form.sale_price) : undefined,
          is_cash_transaction: form.is_cash_transaction || false,
        },
        buyers: buyerList,
        sellers: sellerList,
        client_emails: cleanClientEmails,
        agent_name: form.agent || "",
        agent_email: form.agent_email || "",
        agent_phone: form.agent_phone || form.client_phone || "",
        property_address: isBuyerAgency ? "Pre-Transaction — Buyer Representation" : (form.address || ""),
        document_url: documentUrl,
        document_name: documentName,
        // honeypot (intentionally blank — backend checks this)
        _honey: "",
      });

      if (res.data?.error) throw new Error(res.data.error);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    }
    setSubmitting(false);
  };



  // ── Success ───────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Received!</h2>
        <p className="text-gray-500 mb-3">
          Your deal has been submitted and is <strong>pending TC review</strong>. You'll receive a confirmation once it's approved and activated.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm mb-6">
          <AlertTriangle className="w-4 h-4" /> Pending Review — Not yet active
        </div>
        <div>
          <Button onClick={() => { setSubmitted(false); setDealType(null); setEmailVerified(false); setShowOTP(false); }} className="bg-blue-600 hover:bg-blue-700">
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  // ── TC Review Tab (TC users only) ─────────────────────────────────────────

  const isBuyerUC = dealType === "buyer_uc";
  const isSellerUC = dealType === "seller_uc";
  const isListing = dealType === "listing";
  const isBoth = dealType === "both";
  const isBuyerAgency = isBuyerUC && docType === "buyer_agency";
  const isUnderContract = (isBoth || isBuyerUC || isSellerUC) && !isBuyerAgency;
  const requiresDoc = !isBuyerAgency;
  const dealConfig = DEAL_TYPES.find(d => d.id === dealType);

  // ── Step 1: Type Selection ────────────────────────────────────────────────

  if (!dealType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* TC tab switcher */}
        {isTC && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
            {[{ id: "submit", label: "Submit Deal", icon: Send }, { id: "review", label: "Pending Reviews", icon: ClipboardList }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "shadow-sm" : ""}`}
                style={activeTab === tab.id ? { background: "var(--card-bg)", color: "var(--text-primary)" } : { color: "var(--text-muted)" }}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "review" && isTC ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pending Intake Reviews</h1>
              <p className="text-sm text-gray-500 mt-0.5">Approve or reject agent deal submissions below.</p>
            </div>
            <IntakePendingReviews currentUser={currentUser} />
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deal Intake</h1>
              <p className="text-sm text-gray-500 mt-0.5">What are you creating today?</p>
            </div>



            <div className="grid grid-cols-1 gap-3">
              {DEAL_TYPES.map(({ id, label, desc, icon: Icon, color, bg }) => (
                <button key={id} onClick={() => selectDealType(id)}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md"
                  style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = bg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card-bg)"; }}>
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
          </>
        )}
      </div>
    );
  }

  // ── Step 2: Form ──────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setDealType(null)} className="text-sm text-blue-600 hover:underline">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isBuyerAgency ? "Buyer Representation Agreement" : dealConfig?.label}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isListing ? "Create a listing file — buyer fields not required yet."
              : isBoth ? "Dual transaction — both buyer and seller represented."
              : isBuyerAgency ? "Pre-transaction representation agreement."
              : isSellerUC ? "Seller-side under contract — PSA signed, buyer financing and inspections tracked."
              : "Buyer-side — PSA, lender, inspections, appraisal tracked."}
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
        <p>Email verification required · All submissions are reviewed by a TC before activation · Agent portal access codes are issued after approval.</p>
      </div>

      {/* ── Email Verification — top of form ── */}
      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Email Verification *</p>
          {emailVerified ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Email verified — <strong>{form.agent_email}</strong></span>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <Label className="text-sm font-medium text-gray-700">Agent Email *</Label>
                <Input
                  type="email"
                  className="mt-1.5"
                  placeholder="agent@brokerage.com"
                  value={form.agent_email || ""}
                  onChange={e => { set("agent_email", e.target.value); setEmailVerified(false); }}
                  required
                />
              </div>
              <OTPVerification
                email={form.agent_email}
                onVerified={() => { setEmailVerified(true); setShowOTP(false); }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Upload — only shown after email verified */}
      {!emailVerified && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p>Verify your email above to unlock the form and document upload.</p>
        </div>
      )}

      {emailVerified && <Card className="shadow-sm border-blue-100 bg-blue-50/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-base font-semibold">
                Upload Agreement {requiresDoc && <span className="text-red-500 text-sm font-normal ml-1">* Required</span>}
              </CardTitle>
            </div>
            {isBuyerUC && (
              <div className="flex gap-0.5 p-0.5 rounded-lg bg-white border border-gray-200">
                <button type="button" onClick={() => handleDocTypeChange("ps")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${docType === "ps" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Purchase &amp; Sale
                </button>
                <button type="button" onClick={() => handleDocTypeChange("buyer_agency")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${docType === "buyer_agency" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  Buyer Agency
                </button>
              </div>
            )}
          </div>
          <CardDescription>
            {isListing ? "Upload your listing agreement — AI auto-fills seller, list price, commission"
              : isBuyerAgency ? "Optional — AI reads buyer agency agreement fields"
              : "Required — AI auto-fills buyer, seller, and all deadline dates"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>}

      {emailVerified && <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-6">
          {/* Honeypot — hidden from humans */}
          <input
            type="text"
            name="_honey"
            style={{ display: "none", visibility: "hidden", position: "absolute" }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={form._honey || ""}
            onChange={e => set("_honey", e.target.value)}
          />

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── BUYER AGENCY FORM ── */}
            {isBuyerAgency ? (
              <>
                <Section label="Buyer Information">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Buyer Name(s) *</Label>
                    {buyers.map((b, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={b} onChange={e => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }}
                          placeholder={i === 0 ? "John Smith" : "Additional buyer"} required={i === 0} className="flex-1" />
                        {buyers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setBuyers([...buyers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Buyer</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <F label="Buyer Agent Name" id="buyers_agent_name"><Input id="buyers_agent_name" value={form.buyers_agent_name || ""} onChange={e => set("buyers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" /></F>
                    <F label="Buyer Brokerage" id="buyer_brokerage"><Input id="buyer_brokerage" value={form.buyer_brokerage || ""} onChange={e => set("buyer_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" /></F>
                  </div>
                </Section>
                <Separator />
                <Section label="Agreement Dates">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Agreement Start Date *" id="contract_date"><Input id="contract_date" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} required className="mt-1.5" /></F>
                    <F label="Agreement Expiration Date *" id="agreement_expiration_deadline"><Input id="agreement_expiration_deadline" type="date" value={form.agreement_expiration_deadline || ""} onChange={e => set("agreement_expiration_deadline", e.target.value)} required className="mt-1.5" /></F>
                  </div>
                </Section>
                <Separator />
                <Section label="Compensation">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Compensation" id="commission"><Input id="commission" value={form.commission || ""} onChange={e => set("commission", e.target.value)} placeholder="e.g. 2.5% or $5,000" className="mt-1.5" /></F>
                    <F label="Retainer Fee" id="retainer_fee"><Input id="retainer_fee" value={form.retainer_fee || ""} onChange={e => set("retainer_fee", e.target.value)} placeholder="e.g. $500" className="mt-1.5" /></F>
                  </div>
                </Section>
                <Separator />
                <Section label="Agency Settings">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div><p className="text-sm font-medium text-gray-800">Designated Agency</p><p className="text-xs text-gray-400">Agent designated exclusively to represent the buyer</p></div>
                      <Switch checked={form.designated_agency || false} onCheckedChange={v => set("designated_agency", v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div><p className="text-sm font-medium text-gray-800">Dual Agency Consent</p><p className="text-xs text-gray-400">Buyer consents to potential dual agency</p></div>
                      <Switch checked={form.dual_agency_consent || false} onCheckedChange={v => set("dual_agency_consent", v)} />
                    </div>
                  </div>
                </Section>
                <Separator />
                <AgentContactSection form={form} set={set} />
                <Separator />
                <ClientContactSection clientEmails={clientEmails} setClientEmails={setClientEmails} form={form} set={set} />
              </>
            ) : (
              /* ── STANDARD FORM ── */
              <>
                <Section label="Property">
                  <F label="Property Address *" id="address"><Input id="address" value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="123 Main St, City, State" required className="mt-1.5" /></F>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="MLS Number" id="mls_number"><Input id="mls_number" value={form.mls_number || ""} onChange={e => set("mls_number", e.target.value)} placeholder="MLS#" className="mt-1.5" /></F>
                    <F label={isListing ? "List Price" : "Sale Price"} id="sale_price"><Input id="sale_price" type="number" value={form.sale_price || ""} onChange={e => set("sale_price", e.target.value)} placeholder="e.g. 600000" className="mt-1.5" /></F>
                    <F label="Commission" id="commission"><Input id="commission" value={form.commission || ""} onChange={e => set("commission", e.target.value)} placeholder="5% or $15,000" className="mt-1.5" /></F>
                  </div>
                </Section>
                <Separator />
                {isBuyerUC && (
                  <>
                    <Section label="Buyer Side">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Buyer Name(s) *</Label>
                        {buyers.map((b, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input value={b} onChange={e => { const n = [...buyers]; n[i] = e.target.value; setBuyers(n); }} placeholder={i === 0 ? "John Smith" : "Additional buyer"} required={i === 0} className="flex-1" />
                            {buyers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => setBuyers(buyers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setBuyers([...buyers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Buyer</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <F label="Buyer's Agent Name" id="buyers_agent_name"><Input id="buyers_agent_name" value={form.buyers_agent_name || ""} onChange={e => set("buyers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" /></F>
                        <F label="Buyer Brokerage" id="buyer_brokerage"><Input id="buyer_brokerage" value={form.buyer_brokerage || ""} onChange={e => set("buyer_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" /></F>
                      </div>
                    </Section>
                    <Separator />
                  </>
                )}
                <Section label="Seller Side">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Seller Name(s) *</Label>
                    {sellers.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={s} onChange={e => { const n = [...sellers]; n[i] = e.target.value; setSellers(n); }} placeholder={i === 0 ? "Robert Doe" : "Additional seller"} required={i === 0} className="flex-1" />
                        {sellers.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => setSellers(sellers.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setSellers([...sellers, ""])}><Plus className="w-3 h-3 mr-1" /> Add Seller</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <F label="Seller's Agent Name" id="sellers_agent_name"><Input id="sellers_agent_name" value={form.sellers_agent_name || ""} onChange={e => set("sellers_agent_name", e.target.value)} placeholder="Agent full name" className="mt-1.5" /></F>
                    <F label="Seller Brokerage" id="seller_brokerage"><Input id="seller_brokerage" value={form.seller_brokerage || ""} onChange={e => set("seller_brokerage", e.target.value)} placeholder="Brokerage name" className="mt-1.5" /></F>
                  </div>
                </Section>
                <Separator />
                <Section label="Coordinator &amp; Title">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Transaction Coordinator *" id="agent"><Input id="agent" value={form.agent || ""} onChange={e => set("agent", e.target.value)} placeholder="TC Name" required className="mt-1.5" /></F>
                    <F label="TC Email *" id="agent_email"><Input id="agent_email" type="email" value={form.agent_email || ""} onChange={e => { set("agent_email", e.target.value); setEmailVerified(false); }} placeholder="tc@office.com" required className="mt-1.5" /></F>
                    {isUnderContract && (
                      <F label="Closing / Title Company" id="closing_title_company"><Input id="closing_title_company" value={form.closing_title_company || ""} onChange={e => set("closing_title_company", e.target.value)} placeholder="NH Title & Escrow" className="mt-1.5" /></F>
                    )}
                  </div>
                </Section>
                <Separator />
                <ClientContactSection clientEmails={clientEmails} setClientEmails={setClientEmails} form={form} set={set} />
                {isListing && (
                  <>
                    <Separator />
                    <Section label="Listing Dates">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Listing Start Date" id="contract_date"><Input id="contract_date" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} className="mt-1.5" /></F>
                        <F label="Listing Expiration Date" id="closing_date"><Input id="closing_date" type="date" value={form.closing_date || ""} onChange={e => set("closing_date", e.target.value)} className="mt-1.5" /></F>
                      </div>
                    </Section>
                  </>
                )}
                {isBuyerUC && (
                  <>
                    <Separator />
                    <Section label="Lender">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <F label="Lender Name" id="lender_name"><Input id="lender_name" value={form.lender_name || ""} onChange={e => set("lender_name", e.target.value)} placeholder="Jane Smith" className="mt-1.5" /></F>
                        <F label="Lender Email" id="lender_email"><Input id="lender_email" type="email" value={form.lender_email || ""} onChange={e => set("lender_email", e.target.value)} placeholder="lender@bank.com" className="mt-1.5" /></F>
                        <F label="Lender Phone" id="lender_phone"><Input id="lender_phone" type="tel" value={form.lender_phone || ""} onChange={e => set("lender_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" /></F>
                      </div>
                    </Section>
                  </>
                )}
                {isUnderContract && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div><p className="text-sm font-medium text-gray-800">Cash Transaction</p><p className="text-xs text-gray-400">No financing required</p></div>
                      <Switch checked={form.is_cash_transaction || false} onCheckedChange={v => set("is_cash_transaction", v)} />
                    </div>
                    <Section label="Key Dates &amp; Deadlines">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Contract / Effective Date" id="contract_date"><Input id="contract_date" type="date" value={form.contract_date || ""} onChange={e => set("contract_date", e.target.value)} className="mt-1.5" /></F>
                        <F label="Closing / Transfer of Title Date" id="closing_date"><Input id="closing_date" type="date" value={form.closing_date || ""} onChange={e => set("closing_date", e.target.value)} className="mt-1.5" /></F>
                        <F label="Earnest Money Deadline" id="earnest_money_deadline"><Input id="earnest_money_deadline" type="date" value={form.earnest_money_deadline || ""} onChange={e => set("earnest_money_deadline", e.target.value)} className="mt-1.5" /></F>
                        <F label="Inspection Deadline" id="inspection_deadline"><Input id="inspection_deadline" type="date" value={form.inspection_deadline || ""} onChange={e => set("inspection_deadline", e.target.value)} className="mt-1.5" /></F>
                        <F label="Due Diligence Deadline" id="due_diligence_deadline"><Input id="due_diligence_deadline" type="date" value={form.due_diligence_deadline || ""} onChange={e => set("due_diligence_deadline", e.target.value)} className="mt-1.5" /></F>
                        {!form.is_cash_transaction && (
                          <F label="Financing Commitment Date" id="financing_deadline"><Input id="financing_deadline" type="date" value={form.financing_deadline || ""} onChange={e => set("financing_deadline", e.target.value)} className="mt-1.5" /></F>
                        )}
                      </div>
                    </Section>
                  </>
                )}
              </>
            )}

            {/* ── Agent Contact + Phone ── */}
            {!isBuyerAgency && (
              <>
                <Separator />
                <AgentContactSection form={form} set={set} onEmailChange={() => setEmailVerified(false)} />
              </>
            )}

            {/* ── Error ── */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}

            {/* ── Submit ── */}
            <div className="flex justify-end pt-2">
              <Button type="submit"
                disabled={submitting || !emailVerified || (requiresDoc && !documentUrl)}
                className="bg-blue-600 hover:bg-blue-700 px-8 gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isListing ? "Submit Listing" : isBoth ? "Submit Dual Transaction" : isBuyerAgency ? "Submit Representation Agreement" : isSellerUC ? "Submit Seller Transaction" : "Submit Buyer Transaction"}
              </Button>
            </div>
            {!emailVerified && (
              <p className="text-xs text-right text-amber-600">⚠ Verify your email at the top to enable submission</p>
            )}
            {requiresDoc && !documentUrl && (
              <p className="text-xs text-right text-red-500">⚠ A signed document upload is required</p>
            )}
          </form>
        </CardContent>
      </Card>}
    </div>
  );
}

// ── Shared sub-form sections ──────────────────────────────────────────────────

function AgentContactSection({ form, set, onEmailChange }) {
  return (
    <Section label="Agent Contact">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="Agent / TC Name *" id="agent_name_f">
          <Input id="agent_name_f" value={form.agent || ""} onChange={e => set("agent", e.target.value)} placeholder="Full name" required className="mt-1.5" />
        </F>
        <F label="Agent Email *" id="agent_email_f">
          <Input id="agent_email_f" type="email" value={form.agent_email || ""}
            onChange={e => { set("agent_email", e.target.value); if (onEmailChange) onEmailChange(); }}
            placeholder="agent@brokerage.com" required className="mt-1.5" />
        </F>
        <F label="Agent Phone *" id="agent_phone_f">
          <Input id="agent_phone_f" type="tel" value={form.agent_phone || ""} onChange={e => set("agent_phone", e.target.value)} placeholder="(555) 123-4567" required className="mt-1.5" />
        </F>
      </div>
    </Section>
  );
}

function ClientContactSection({ clientEmails, setClientEmails, form, set }) {
  return (
    <Section label="Client Contact">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Client Email(s)</Label>
        {clientEmails.map((email, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input type="email" value={email}
              onChange={e => { const next = [...clientEmails]; next[i] = e.target.value; setClientEmails(next); }}
              placeholder={i === 0 ? "client@email.com" : "Additional client email"} className="flex-1" />
            {clientEmails.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500"
                onClick={() => setClientEmails(clientEmails.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="text-xs h-8 mt-1" onClick={() => setClientEmails([...clientEmails, ""])}>
          <Plus className="w-3 h-3 mr-1" /> Add Another Email
        </Button>
      </div>
      <F label="Client Phone" id="client_phone">
        <Input id="client_phone" type="tel" value={form.client_phone || ""} onChange={e => set("client_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5" />
      </F>
    </Section>
  );
}