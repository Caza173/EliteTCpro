import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import ContractReviewForm from "./ContractReviewForm";
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileText, Sparkles, ArrowRight, X,
} from "lucide-react";

const STEPS = ["upload", "parsing", "review", "creating", "done"];

function StepIndicator({ step }) {
  const labels = ["Upload", "AI Parsing", "Review", "Creating", "Done"];
  const current = STEPS.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            i < current ? "text-emerald-600" : i === current ? "text-blue-600" : "text-gray-300"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < current ? "bg-emerald-100 text-emerald-600" :
              i === current ? "bg-blue-100 text-blue-600" :
              "bg-gray-100 text-gray-300"
            }`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-px max-w-8 transition-colors ${i < current ? "bg-emerald-300" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ContractIntakeModal({ open, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [txId, setTxId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const reset = () => {
    setStep("upload");
    setFile(null);
    setFileUrl(null);
    setExtracted(null);
    setError(null);
    setTxId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (f) => {
    if (!f) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|docx)$/i)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    setFile(f);
    setError(null);
    setStep("parsing");

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);

      // Run AI extraction (reuse existing parsePurchaseAgreementV2)
      const res = await base44.functions.invoke("parsePurchaseAgreementV2", { file_url });
      if (res.data?.error) throw new Error(res.data.error);

      setExtracted(res.data);
      setStep("review");
    } catch (e) {
      setError(e.message || "Failed to parse document. Please try again.");
      setStep("upload");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleCreate = async () => {
    if (!extracted.property_address) {
      setError("Property address is required before creating the transaction.");
      return;
    }
    setError(null);
    setStep("creating");
    try {
      const res = await base44.functions.invoke("createTransactionFromContract", {
        extracted,
        file_url: fileUrl,
        file_name: file?.name || "Purchase and Sale Agreement.pdf",
      });
      if (res.data?.error) throw new Error(res.data.error);
      setTxId(res.data.transaction_id);
      setStep("done");
    } catch (e) {
      setError(e.message || "Failed to create transaction.");
      setStep("review");
    }
  };

  const goToTransaction = () => {
    handleClose();
    navigate(createPageUrl("TransactionDetail") + `?id=${txId}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Contract Intake Engine
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <StepIndicator step={step} />

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
              <button className="ml-auto" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* STEP: Upload */}
          {step === "upload" && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
              <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700 text-base">Drop your P&S Agreement here</p>
              <p className="text-sm text-gray-400 mt-1">PDF or DOCX · Click to browse</p>
              <Button className="mt-5 bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload className="w-4 h-4 mr-2" /> Choose File
              </Button>
            </div>
          )}

          {/* STEP: Parsing */}
          {step === "parsing" && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">AI is reading your contract</p>
                <p className="text-sm text-gray-400 mt-1">Extracting parties, dates, and financials…</p>
              </div>
              {file && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  <FileText className="w-3.5 h-3.5" />
                  {file.name}
                </div>
              )}
              <Progress value={66} className="max-w-xs mx-auto h-1.5" />
            </div>
          )}

          {/* STEP: Review */}
          {step === "review" && extracted && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>AI extraction complete. Review and edit any fields before creating the transaction.</span>
              </div>
              {file && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500 border">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{file.name}</span>
                </div>
              )}
              <ContractReviewForm data={extracted} onChange={setExtracted} />
            </div>
          )}

          {/* STEP: Creating */}
          {step === "creating" && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">Creating your transaction</p>
                <p className="text-sm text-gray-400 mt-1">Setting up transaction, contacts, financials, and documents…</p>
              </div>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-xl">Transaction Created!</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{extracted?.property_address}</span> is ready in your dashboard.
                </p>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>✓ Transaction record created</p>
                <p>✓ Contacts & participants added</p>
                <p>✓ Financial record created</p>
                <p>✓ Contract document stored</p>
                <p>✓ Transaction summary updated</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t mt-2">
          <Button variant="outline" onClick={handleClose}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          <div className="flex gap-2">
            {step === "review" && (
              <>
                <Button variant="outline" onClick={reset} className="text-gray-500">
                  Start Over
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleCreate}
                  disabled={!extracted?.property_address}
                >
                  Create Transaction <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
            {step === "done" && (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={goToTransaction}>
                Open Transaction <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}