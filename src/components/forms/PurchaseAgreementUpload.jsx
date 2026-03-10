import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import PSReviewModal from "./PSReviewModal";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const PS_PROMPT = `You are a real estate contract analyst specializing in New Hampshire Purchase and Sales Agreements (NHAR P&S).

Read this document carefully and extract all of the following fields. Be thorough — scan every page including signature blocks and section 20.

Return a single JSON object. If a field is not found, return null. Do NOT guess or invent values.

Fields:
- effectiveDate: ISO date (YYYY-MM-DD) — the Acceptance Date or Effective Date of the agreement
- closingDate: ISO date — the Closing Date or Transfer of Title date
- transferOfTitleDate: ISO date — if explicitly stated separately from closingDate
- inspectionDeadline: ISO date — the actual calendar date for the inspection deadline (calculate from effective date + days if given as offset)
- earnestMoneyDeadline: ISO date — the actual calendar date earnest money deposit is due
- dueDiligenceDeadline: ISO date — the actual calendar date for due diligence
- financingCommitmentDate: ISO date — Financing Commitment / Financial Commitment Date
- earnestMoneyDays: integer — days from effective date for earnest money (if no absolute date is given)
- inspectionDays: integer — days from effective date for inspection period
- dueDiligenceDays: integer — days from effective date for due diligence
- generalBuildingInspectionDays: integer
- sewageInspectionDays: integer
- waterQualityInspectionDays: integer
- radonInspectionDays: integer
- purchasePrice: number — the sale price
- depositAmount: number — the deposit/earnest money amount
- buyerName: string — full buyer name(s) from Section 1 (e.g. "John Smith and Jane Smith")
- sellerName: string — full seller name(s) from Section 1
- propertyAddress: string — full street address of the property
- buyersAgentName: string — agent representing BUYER. Look for "Buyer's Agent", "Selling Agent", "BA:", or the agent in the Buyer's Brokerage signature block
- sellersAgentName: string — agent representing SELLER. Look for "Listing Agent", "Seller's Agent", "LA:", or agent in Listing Brokerage block
- buyerBrokerage: string — brokerage firm representing the buyer
- sellerBrokerage: string — brokerage firm representing the seller
- closingTitleCompany: string — title company, closing attorney, or settlement agent
- section20AdditionalProvisions: string — verbatim text from the "Additional Provisions" section of Section 20
- section20Concessions: string — verbatim text from "Concessions" in Section 20
- section20ProfessionalFee: string — verbatim text from "Professional Fee" in Section 20
- professionalFeeType: "percent" or "flat" or null
- professionalFeeValue: number — e.g. 2 for "2%" or 5000 for "$5,000"
- professionalFeeBase: "contract_price" or "sale_price" or "flat" or null
- sellerConcessionAmount: number — flat dollar concession from seller
- sellerConcessionPercent: number — percent-based concession
- additionalCompensationNotes: string — any other compensation language

Extraction tips:
- Dates formatted as "within X days of the EFFECTIVE DATE" should be converted to actual ISO dates using the effectiveDate
- Look for buyer/seller names in "This Agreement is between [BUYER NAME] (Buyer) and [SELLER NAME] (Seller)"
- Agent signature blocks typically appear at the end of the document
- Section 20 often contains critical commission and concession language
`;

const SCHEMA = {
  type: "object",
  properties: {
    effectiveDate: { type: "string" },
    closingDate: { type: "string" },
    transferOfTitleDate: { type: "string" },
    inspectionDeadline: { type: "string" },
    earnestMoneyDeadline: { type: "string" },
    dueDiligenceDeadline: { type: "string" },
    financingCommitmentDate: { type: "string" },
    earnestMoneyDays: { type: "number" },
    inspectionDays: { type: "number" },
    dueDiligenceDays: { type: "number" },
    generalBuildingInspectionDays: { type: "number" },
    sewageInspectionDays: { type: "number" },
    waterQualityInspectionDays: { type: "number" },
    radonInspectionDays: { type: "number" },
    purchasePrice: { type: "number" },
    depositAmount: { type: "number" },
    buyerName: { type: "string" },
    sellerName: { type: "string" },
    propertyAddress: { type: "string" },
    buyersAgentName: { type: "string" },
    sellersAgentName: { type: "string" },
    buyerBrokerage: { type: "string" },
    sellerBrokerage: { type: "string" },
    closingTitleCompany: { type: "string" },
    section20AdditionalProvisions: { type: "string" },
    section20Concessions: { type: "string" },
    section20ProfessionalFee: { type: "string" },
    professionalFeeType: { type: "string" },
    professionalFeeValue: { type: "number" },
    professionalFeeBase: { type: "string" },
    sellerConcessionAmount: { type: "number" },
    sellerConcessionPercent: { type: "number" },
    additionalCompensationNotes: { type: "string" },
  },
};

export default function PurchaseAgreementUpload({ onParsed }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | review | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) {
      setErrorMsg("Accepted: PDF, images (JPG/PNG), or DOCX files.");
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
    setStatus("uploading");
    setErrorMsg("");

    // 1. Upload file to get a URL
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStatus("parsing");

    // 2. Send to Base44 AI with file_urls (native document reading)
    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: PS_PROMPT,
      file_urls: [file_url],
      response_json_schema: SCHEMA,
    });

    const data = result.data || result;
    console.log("P&S AI Extraction result:", data);

    if (!data || typeof data !== "object") {
      setErrorMsg("Could not read this document. Please enter details manually.");
      setStatus("error");
      return;
    }

    setExtractedData(data);
    setStatus("review");
  };

  const handleConfirm = (reviewedFields) => {
    // Merge reviewed fields back into the full extracted object
    const merged = { ...extractedData, ...reviewedFields };
    setStatus("done");
    setExtractedData(null);
    onParsed(merged);
  };

  const handleCancelReview = () => {
    setStatus("idle");
    setExtractedData(null);
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    setExtractedData(null);
  };

  const isProcessing = status === "uploading" || status === "parsing";

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
              dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Upload Purchase &amp; Sales Agreement</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, image scans, or DOCX — click to browse</p>
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

        {/* Status messages */}
        {status === "uploading" && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading document...
          </div>
        )}
        {status === "parsing" && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is reading your P&amp;S — extracting deadlines, parties &amp; Section 20...
          </div>
        )}
        {status === "done" && (
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

        {/* Scan button */}
        {file && status === "idle" && (
          <Button
            type="button"
            onClick={handleProcess}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
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