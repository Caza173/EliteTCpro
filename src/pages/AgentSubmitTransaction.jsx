import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle, Loader2, Upload, X, ChevronRight, ChevronLeft } from "lucide-react";

const TX_TYPES = [
  {
    id: "buyer",
    label: "Buyer Under Contract",
    desc: "Represent a buyer who has an accepted offer",
    docs: [
      { key: "purchase_sale", label: "Purchase & Sales Agreement", required: true },
      { key: "buyer_agency", label: "Buyer Agency Agreement", required: false },
    ],
  },
  {
    id: "listing_under_contract",
    label: "Listing Under Contract",
    desc: "Your listing has an accepted offer",
    docs: [
      { key: "purchase_sale", label: "Purchase & Sales Agreement", required: true },
      { key: "listing_agreement", label: "Listing Agreement", required: true },
    ],
  },
  {
    id: "listing_only",
    label: "Listing Only",
    desc: "New listing — no offer yet",
    docs: [
      { key: "listing_agreement", label: "Listing Agreement", required: true },
      { key: "mls_form", label: "MLS Input Form", required: false },
    ],
  },
];

function StepIndicator({ step }) {
  const steps = ["Transaction Type", "Documents", "Details", "Review"];
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i + 1 < step ? "bg-emerald-500 text-white" :
              i + 1 === step ? "bg-slate-900 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {i + 1 < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i + 1 === step ? "text-slate-900" : "text-slate-400"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${i + 1 < step ? "bg-emerald-300" : "bg-slate-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function FileUploadField({ label, required, value, onChange }) {
  const inputRef = React.useRef();
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
        {!required && <span className="text-slate-400 text-xs ml-1">(optional)</span>}
      </Label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm text-emerald-700 truncate flex-1">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-sm text-slate-400"
        >
          <Upload className="w-4 h-4" />
          Click to upload PDF
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

export default function AgentSubmitTransaction() {
  const navigate = useNavigate();
  const { currentUser, isLoading } = useCurrentUser();
  const [step, setStep] = useState(1);
  const [txType, setTxType] = useState(null);
  const [files, setFiles] = useState({});
  const [address, setAddress] = useState("");
  const [tcUsers, setTcUsers] = useState([]);
  const [assignedTC, setAssignedTC] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newTxId, setNewTxId] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      navigate("/agent-signin", { replace: true });
      return;
    }
    const role = currentUser.role;
    if (role !== "agent" && role !== "admin" && role !== "owner") {
      setAccessDenied(true);
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    // Load TC users for assignment dropdown
    base44.entities.User.list().then(users => {
      const tcs = users.filter(u => ["tc", "tc_lead", "admin", "owner"].includes(u.role));
      setTcUsers(tcs);
      if (tcs.length > 0) setAssignedTC(tcs[0].email);
    }).catch(() => {});
  }, []);

  const selectedType = TX_TYPES.find(t => t.id === txType);

  const canProceedStep2 = !!txType;
  const canProceedStep3 = selectedType?.docs.filter(d => d.required).every(d => !!files[d.key]);
  const canProceedStep4 = !!address.trim();

  const handleSubmit = async () => {
    setSubmitting(true);

    // Upload files
    const uploadedDocs = {};
    for (const [key, file] of Object.entries(files)) {
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedDocs[key] = { file_url, file_name: file.name };
      }
    }

    // Map tx type
    const typeMap = { buyer: "buyer", listing_under_contract: "seller", listing_only: "seller" };
    const transactionType = typeMap[txType] || "buyer";

    // Create transaction
    const tx = await base44.entities.Transaction.create({
      address: address.trim(),
      agent: currentUser.full_name || currentUser.email,
      agent_email: currentUser.email,
      transaction_type: transactionType,
      transactionType: txType === "buyer" ? "buyer" : "listing",
      status: "active",
      brokerage_id: currentUser.brokerage_id || "",
    });

    // Create document records
    const docTypeMap = {
      purchase_sale: "purchase_and_sale",
      buyer_agency: "buyer_agency_agreement",
      listing_agreement: "listing_agreement",
      mls_form: "other",
    };

    for (const [key, docData] of Object.entries(uploadedDocs)) {
      await base44.entities.Document.create({
        transaction_id: tx.id,
        brokerage_id: currentUser.brokerage_id || "",
        file_url: docData.file_url,
        file_name: docData.file_name,
        doc_type: docTypeMap[key] || "other",
        uploaded_by: currentUser.email,
        uploaded_by_role: "agent",
      });
    }

    // Trigger parsing for purchase & sales if present
    if (uploadedDocs.purchase_sale) {
      base44.functions.invoke("parsePurchaseAgreementV2", {
        transaction_id: tx.id,
        file_url: uploadedDocs.purchase_sale.file_url,
      }).catch(() => {});
    }
    if (uploadedDocs.listing_agreement) {
      base44.functions.invoke("parseListingAgreement", {
        transaction_id: tx.id,
        file_url: uploadedDocs.listing_agreement.file_url,
      }).catch(() => {});
    }

    setNewTxId(tx.id);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Agents Only</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          This page is only accessible to agents. TCs and admins should use the main dashboard.
        </p>
        <button
          onClick={() => navigate("/Dashboard")}
          className="mt-6 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Transaction Submitted!</h2>
          <p className="text-sm text-slate-500 mb-8">
            Your transaction has been submitted and a coordinator will be assigned shortly. You can track its status below.
          </p>
          <Button
            className="w-full bg-slate-900 hover:bg-slate-800"
            onClick={() => navigate(`/TransactionDetail?id=${newTxId}`)}
          >
            View Transaction Status
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">EliteTC</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Submit a Transaction</h1>
          <p className="text-sm text-slate-400 mb-6">Complete the steps below to get started.</p>

          <StepIndicator step={step} />

          {/* Step 1: Transaction Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-3">Select Transaction Type</p>
              {TX_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTxType(t.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                    txType === t.id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && selectedType && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Upload Documents</p>
              {selectedType.docs.map(doc => (
                <FileUploadField
                  key={doc.key}
                  label={doc.label}
                  required={doc.required}
                  value={files[doc.key] || null}
                  onChange={file => setFiles(prev => ({ ...prev, [doc.key]: file }))}
                />
              ))}
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Transaction Details</p>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Property Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St, Manchester, NH 03101"
                  className="h-10"
                />
              </div>
              {tcUsers.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Assign Transaction Coordinator
                  </Label>
                  <select
                    value={assignedTC}
                    onChange={e => setAssignedTC(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {tcUsers.map(u => (
                      <option key={u.id} value={u.email}>
                        {u.full_name || u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-3">Review & Submit</p>
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 text-sm overflow-hidden">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-900">{selectedType?.label}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-500">Address</span>
                  <span className="font-medium text-slate-900 text-right max-w-[200px]">{address}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-500">Documents</span>
                  <span className="font-medium text-slate-900">
                    {Object.values(files).filter(Boolean).length} uploaded
                  </span>
                </div>
                {assignedTC && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-slate-500">Assigned TC</span>
                    <span className="font-medium text-slate-900">{assignedTC}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && !canProceedStep2) ||
                  (step === 2 && !canProceedStep3) ||
                  (step === 3 && !canProceedStep4)
                }
                className="gap-1.5 bg-slate-900 hover:bg-slate-800"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Transaction"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}