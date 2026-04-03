import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED = ".pdf,.docx,.doc,.txt";
const MAX_MB = 20;

export default function TemplateUploadModal({ open, onClose, brokerageId, onSaved }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState("idle"); // idle | uploading | parsing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();

  if (!open) return null;

  const reset = () => { setFile(null); setStep("idle"); setErrorMsg(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleFilePick = (f) => {
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`File too large (max ${MAX_MB}MB)`); return; }
    setFile(f);
    setErrorMsg("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFilePick(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setStep("uploading");
    setErrorMsg("");

    // 1. Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStep("parsing");

    // 2. Parse via backend
    const res = await base44.functions.invoke("parseTemplateDocument", {
      action: "parse",
      file_url,
      file_name: file.name,
      brokerage_id: brokerageId,
    });

    if (!res.data?.success) {
      setErrorMsg(res.data?.error || "Parsing failed");
      setStep("error");
      return;
    }

    const { parsed } = res.data;

    // 3. Pre-save as draft template
    const saved = await base44.entities.WorkflowTemplate.create({
      brokerage_id: brokerageId,
      name: parsed.template_name,
      transaction_type: parsed.transaction_type || "buyer",
      source: "uploaded",
      original_file_url: file_url,
      original_file_name: file.name,
      phases: parsed.phases || [],
      tasks: parsed.tasks || [],
      deadlines: parsed.deadlines || [],
      doc_checklist: parsed.doc_checklist || [],
      compliance_rules: parsed.compliance_rules || [],
    });

    setStep("done");
    setTimeout(() => onSaved(saved), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Upload Template Document</h2>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {step === "idle" && (
          <>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              style={{ borderColor: file ? "var(--accent)" : "var(--card-border)" }}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden"
                onChange={e => { if (e.target.files[0]) handleFilePick(e.target.files[0]); }} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Drop PDF, DOCX, or TXT here</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>or click to browse · max {MAX_MB}MB</p>
                </div>
              )}
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              The document will be parsed by AI and converted into a structured workflow template with phases, tasks, and deadlines.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleClose}>Cancel</Button>
              <Button size="sm" className="flex-1 gap-1.5" disabled={!file} onClick={handleParse}>
                <Upload className="w-4 h-4" /> Parse Template
              </Button>
            </div>
          </>
        )}

        {(step === "uploading" || step === "parsing") && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {step === "uploading" ? "Uploading document…" : "AI is parsing your template…"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {step === "parsing" ? "Extracting phases, tasks, and deadlines. This may take 15–30 seconds." : ""}
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Template parsed successfully!</p>
            <p className="text-xs text-gray-400">Opening editor…</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-medium text-red-600">{errorMsg}</p>
            <Button size="sm" variant="outline" onClick={() => setStep("idle")}>Try Again</Button>
          </div>
        )}
      </div>
    </div>
  );
}