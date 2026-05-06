import React, { useState } from "react";
import { signatureRequestsApi } from "@/api/signatureRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Send, PenLine, FileText, User, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["Buyer", "Seller", "Agent", "Lender", "Other"];

const SIG_STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  partially_signed: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
};

function buildDefaultSigners(transaction) {
  const signers = [];
  const buyers = transaction?.buyers?.length ? transaction.buyers : (transaction?.buyer ? [transaction.buyer] : []);
  const emails = transaction?.client_emails?.length ? transaction.client_emails : (transaction?.client_email ? [transaction.client_email] : []);
  buyers.forEach((name, i) => {
    if (name) signers.push({ name, email: emails[i] || "", role: "Buyer" });
  });
  if (transaction?.agent) signers.push({ name: transaction.agent, email: transaction.agent_email || "", role: "Agent" });
  return signers.length ? signers : [{ name: "", email: "", role: "Buyer" }];
}

export default function RequestSignatureModal({ transaction, documents, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=select doc, 2=assign signers, 3=send
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [signers, setSigners] = useState(() => buildDefaultSigners(transaction));
  const [sending, setSending] = useState(false);

  const addSigner = () => setSigners(s => [...s, { name: "", email: "", role: "Buyer" }]);
  const removeSigner = (i) => setSigners(s => s.filter((_, idx) => idx !== i));
  const updateSigner = (i, field, val) => setSigners(s => s.map((sg, idx) => idx === i ? { ...sg, [field]: val } : sg));

  const handleSend = async () => {
    if (!selectedDoc) return toast.error("Please select a document");
    const invalid = signers.find(s => !s.name.trim() || !s.email.trim());
    if (invalid) return toast.error("All signers require a name and email");

    setSending(true);
    try {
      await signatureRequestsApi.create({
        transaction_id: transaction.id,
        document_id: selectedDoc.id,
        title: selectedDoc.file_name || "Signature Request",
        subject: `Signature Request: ${transaction.address || selectedDoc.file_name || "Document"}`,
        message: `Please review and sign ${selectedDoc.file_name || "this document"}.`,
        recipients: signers.map((signer, index) => ({
          name: signer.name,
          email: signer.email,
          role: signer.role.toLowerCase(),
          routing_order: index + 1,
        })),
      });

      toast.success("Signature request sent!");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error("Failed to send: " + (err.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full border rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-colors";
  const inputStyle = { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{ background: "var(--card-bg)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PenLine className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Request Signature</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Step {step} of 3 — {step === 1 ? "Select Document" : step === 2 ? "Assign Signers" : "Review & Send"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-5 pt-3 flex-shrink-0">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-blue-600" : "bg-gray-200"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Step 1: Select Document */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Choose a document to send for signature</p>
              {documents.length === 0 ? (
                <div className="text-center py-8 rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No documents uploaded yet.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Upload a document in the Documents tab first.</p>
                </div>
              ) : (
                documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedDoc?.id === doc.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{doc.file_name}</p>
                      <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{doc.doc_type?.replace(/_/g, " ")}</p>
                    </div>
                    {selectedDoc?.id === doc.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Signers */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Who needs to sign?</p>
              {signers.map((signer, i) => (
                <div key={i} className="p-3 rounded-xl border space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Signer {i + 1}</span>
                    </div>
                    {signers.length > 1 && (
                      <button onClick={() => removeSigner(i)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputCls} style={inputStyle}
                      placeholder="Full Name"
                      value={signer.name}
                      onChange={e => updateSigner(i, "name", e.target.value)}
                    />
                    <select
                      className={inputCls} style={inputStyle}
                      value={signer.role}
                      onChange={e => updateSigner(i, "role", e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <input
                    className={inputCls} style={inputStyle}
                    type="email"
                    placeholder="Email address"
                    value={signer.email}
                    onChange={e => updateSigner(i, "email", e.target.value)}
                  />
                </div>
              ))}
              <button
                onClick={addSigner}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Another Signer
              </button>
            </div>
          )}

          {/* Step 3: Review & Send */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Document</p>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{selectedDoc?.file_name}</span>
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Signers ({signers.length})</p>
                {signers.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                      {s.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                    </div>
                    <Badge className="text-[10px]">{s.role}</Badge>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Each signer will receive a unique, secure email link. By signing, they agree to execute this document electronically under the ESIGN Act.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          <Button variant="outline" size="sm" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? "Cancel" : <><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back</>}
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              disabled={step === 1 && !selectedDoc}
              onClick={() => setStep(s => s + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? "Sending…" : "Send for Signature"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}