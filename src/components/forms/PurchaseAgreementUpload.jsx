import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { uploadsApi } from "@/api/uploads";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Zap } from "lucide-react";
import PSReviewModal from "./PSReviewModal";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Map V2 API output → app camelCase fields
function normalizeV2(src) {
  const calcDate = (base, days) => {
    if (!base || days == null) return null;
    try {
      const d = new Date(base + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
      return d.toISOString().split("T")[0];
    } catch { return null; }
  };

  const acceptanceDate = src.acceptance_date || null;

  return {
    // Parties
    buyerName:               src.buyer_names               || null,
    sellerName:              src.seller_names              || null,
    // Property
    propertyAddress:         src.property_address          || null,
    // Financials
    purchasePrice:           src.purchase_price            ?? null,
    depositAmount:           src.deposit_amount            ?? null,
    commission:              src.commission_percent        ?? null,
    // Dates
    effectiveDate:           acceptanceDate,
    closingDate:             src.closing_date              || null,
    // Deadlines
    inspectionDeadline:      src.inspection_deadline       || calcDate(acceptanceDate, src.inspection_days),
    financingCommitmentDate: src.financing_commitment_date || null,
    earnestMoneyDeadline:    src.earnest_money_deadline    || src.earnestMoneyDeadline    || calcDate(acceptanceDate, src.earnest_money_days),
    dueDiligenceDeadline:    src.due_diligence_deadline    || src.dueDiligenceDeadline    || calcDate(acceptanceDate, src.due_diligence_days),
    // Agents
    buyersAgentName:         src.buyer_agent               || null,
    sellersAgentName:        src.seller_agent              || null,
    buyerBrokerage:          src.buyer_brokerage           || null,
    sellerBrokerage:         src.seller_brokerage          || null,
    closingTitleCompany:     src.title_company             || null,
    // Section 20
    section20Notes:          src.commission_notes          || null,
    sellerConcessionAmount:  src.seller_concession_amount  ?? null,
    professionalFeePercent:  src.professional_fee_percent  ?? null,
    professionalFeeAmount:   src.professional_fee_amount   ?? null,
  };
}

const STAGE_LABELS = {
  uploading:   "Uploading document...",
  extracting:  "Stage 1: Extracting PDF text...",
  splitting:   "Stage 2: Identifying sections (1, 2, 3, 5, 7, 15, 16, 19, 20)...",
  parsing:     "Stage 3: AI extracting each section in parallel...",
  combining:   "Stage 4: Combining fields & calculating deadlines...",
};

export default function PurchaseAgreementUpload({ onParsed, transactionId, brokerageId }) {
  const [file, setFile]               = useState(null);
  const [status, setStatus]           = useState("idle");
  const [stageLabel, setStageLabel]   = useState("");
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragging, setDragging]       = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [sectionsFound, setSectionsFound] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const allowed = [
      "application/pdf",
      "image/jpeg", "image/png", "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(f.type)) {
      setErrorMsg("Accepted: PDF, images (JPG/PNG/WebP), or DOCX files.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setErrorMsg("");

    // Step 1: Upload
    setStatus("uploading");
    setStageLabel(STAGE_LABELS.uploading);
    const upload = await uploadsApi.uploadTemporary(file, { namespace: "purchase-agreements" });

    // Step 2: Extract text from PDF via AI vision (Claude reads the file natively)
    setStatus("extracting");
    setStageLabel(STAGE_LABELS.extracting);

    // We pass the file URL to the backend function which runs the full pipeline
    setStatus("splitting");
    setStageLabel(STAGE_LABELS.splitting);

    // Short pause so user sees the stage message
    await new Promise(r => setTimeout(r, 400));

    setStatus("parsing");
    setStageLabel(STAGE_LABELS.parsing);

    // Call the new V2 function — it handles text extraction + section splitting + parallel AI
    const response = await base44.functions.invoke("parsePurchaseAgreementV2", {
      file_url: upload.signed_url,
      file_key: upload.object_key,
      transaction_id: transactionId || null,
      brokerage_id: brokerageId || null,
    });
    const raw = response?.data;

    if (!raw || raw.error) {
      setErrorMsg(raw?.error || "Extraction failed. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("combining");
    setStageLabel(STAGE_LABELS.combining);
    await new Promise(r => setTimeout(r, 300));

    setSectionsFound(raw._sections_found || []);
    console.log("V2 extraction result:", raw);

    setExtractedData(raw);
    setStatus("review");
  };

  const handleConfirm = (reviewedFields) => {
    const src = { ...extractedData, ...reviewedFields };
    setStatus("done");
    setExtractedData(null);
    onParsed(normalizeV2(src));
  };

  const handleCancelReview = () => {
    setStatus("idle");
    setExtractedData(null);
    setSectionsFound(null);
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    setExtractedData(null);
    setSectionsFound(null);
  };

  const isProcessing = ["uploading","extracting","splitting","parsing","combining"].includes(status);

  return (
    <>
      <div className="space-y-3">
        {/* Drop zone */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
              dragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Upload Purchase &amp; Sales Agreement</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, image scans, or DOCX — click to browse</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              Section-by-section AI extraction (NHAR optimized)
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* File selected */}
        {file && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
            </div>
            {status === "idle" && (
              <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
            {status === "done" && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          </div>
        )}

        {/* Processing stages */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              {stageLabel}
            </div>
            {/* Stage progress pills */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "uploading",  label: "Upload" },
                { key: "extracting", label: "Extract" },
                { key: "splitting",  label: "Split Sections" },
                { key: "parsing",    label: "AI Parse" },
                { key: "combining",  label: "Combine" },
              ].map(({ key, label }, i) => {
                const stages = ["uploading","extracting","splitting","parsing","combining"];
                const currentIdx = stages.indexOf(status);
                const thisIdx = i;
                const done = thisIdx < currentIdx;
                const active = thisIdx === currentIdx;
                return (
                  <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    done   ? "bg-emerald-100 text-emerald-700" :
                    active ? "bg-blue-100 text-blue-700 animate-pulse" :
                             "bg-gray-100 text-gray-400"
                  }`}>
                    {done ? "✓ " : ""}{label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {status === "done" && sectionsFound && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Transaction data applied — {sectionsFound.length} sections parsed.
          </div>
        )}
        {status === "done" && !sectionsFound && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Transaction data applied from P&amp;S.
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {errorMsg || "An error occurred. Please try again."}
          </div>
        )}

        {/* Process button */}
        {file && status === "idle" && (
          <Button
            type="button"
            onClick={handleProcess}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Scan &amp; Auto-Fill Transaction
          </Button>
        )}
      </div>

      {/* Review modal */}
      {status === "review" && extractedData && (
        <PSReviewModal
          extracted={extractedData}
          onConfirm={handleConfirm}
          onCancel={handleCancelReview}
        />
      )}
    </>
  );
}