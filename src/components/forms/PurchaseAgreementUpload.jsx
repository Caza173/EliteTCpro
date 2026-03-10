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

// Precise NHAR P&S extraction prompt — section-by-section
const PS_PROMPT = `You are a real estate document analyst reading a New Hampshire Purchase and Sales Agreement (NHAR form).

READ THE ENTIRE DOCUMENT — all pages, including signature blocks, addenda, and Section 20.

Extract the following fields and return a single JSON object. All dates must be ISO format (YYYY-MM-DD). Numbers must be plain numbers (not strings). Return null for any field not explicitly found — do NOT guess.

FIELDS TO EXTRACT:

buyer_names
  - Full name(s) of the buyer(s). Usually found near "BUYER:" or "This agreement is between [BUYER] and [SELLER]".

seller_names
  - Full name(s) of the seller(s). Found near "SELLER:".

property_address
  - Full street address of the property including city, state, and zip. Usually near "located at" or "Property Address".

purchase_price
  - The agreed sale price. Usually labeled "SELLING PRICE" or "Purchase Price". Return as a number.

deposit_amount
  - The earnest money / initial deposit amount. Return as a number.

acceptance_date
  - The Effective Date or Acceptance Date of the agreement. Often found near the signature block or labeled "Effective Date".

closing_date
  - The Transfer of Title / Closing Date. Usually in a section labeled "TRANSFER OF TITLE" or "Closing Date".

inspection_deadline
  - The actual calendar date (ISO) by which inspections must be completed. If stated as "within X days of the effective date", calculate it: effective_date + X days. Return the computed ISO date.

financing_commitment_date
  - The Financing Commitment / Financial Commitment Deadline. Return as ISO date.

buyer_agent
  - Full name of the agent representing the BUYER. Look for "Buyer's Agent", "Selling Agent", or in the Buyer's Brokerage signature block.

seller_agent
  - Full name of the agent representing the SELLER. Look for "Listing Agent", "Seller's Agent", or in the Listing Brokerage signature block.

buyer_brokerage
  - Name of the brokerage firm representing the BUYER.

seller_brokerage
  - Name of the brokerage firm representing the SELLER.

title_company
  - Name of the title company, closing attorney, or settlement agent handling the closing.

IMPORTANT NOTES:
- If a deadline is written as "within X days of the effective date", compute the actual calendar date and return it as an ISO date.
- Do not return day-offset integers — always return computed ISO dates.
- Scan every page. Agent and brokerage information often appears on the last pages in signature blocks.
- Section 20 may contain additional commission or concession terms — include any relevant compensation in the closest matching field.`;

const SCHEMA = {
  type: "object",
  properties: {
    buyer_names:               { type: "string" },
    seller_names:              { type: "string" },
    property_address:          { type: "string" },
    purchase_price:            { type: "number" },
    deposit_amount:            { type: "number" },
    acceptance_date:           { type: "string" },
    closing_date:              { type: "string" },
    inspection_deadline:       { type: "string" },
    financing_commitment_date: { type: "string" },
    buyer_agent:               { type: "string" },
    seller_agent:              { type: "string" },
    buyer_brokerage:           { type: "string" },
    seller_brokerage:          { type: "string" },
    title_company:             { type: "string" },
  },
};

// Map AI output (snake_case) → app fields (camelCase)
function normalizeExtracted(src) {
  const effectiveDate = src.acceptance_date || null;
  const inspectionDeadline = src.inspection_deadline || null;
  const financingDeadline = src.financing_commitment_date || null;

  // If the AI returned day offsets but no computed dates, calculate them here
  const calcDate = (base, days) => {
    if (!base || days == null) return null;
    try {
      const d = new Date(base);
      d.setDate(d.getDate() + Number(days));
      return d.toISOString().split("T")[0];
    } catch { return null; }
  };

  return {
    // Parties
    buyerName:               src.buyer_names               || null,
    sellerName:              src.seller_names              || null,
    // Property
    propertyAddress:         src.property_address          || null,
    // Financials
    purchasePrice:           src.purchase_price            ?? null,
    depositAmount:           src.deposit_amount            ?? null,
    // Dates
    effectiveDate,
    closingDate:             src.closing_date              || null,
    // Deadlines — prefer direct AI date, fall back to offset calculation
    inspectionDeadline:      inspectionDeadline            || calcDate(effectiveDate, src.inspection_days),
    financingCommitmentDate: financingDeadline,
    earnestMoneyDeadline:    calcDate(effectiveDate, src.earnest_money_days),
    dueDiligenceDeadline:    calcDate(effectiveDate, src.due_diligence_days),
    // Agents
    buyersAgentName:         src.buyer_agent               || null,
    sellersAgentName:        src.seller_agent              || null,
    buyerBrokerage:          src.buyer_brokerage           || null,
    sellerBrokerage:         src.seller_brokerage          || null,
    closingTitleCompany:     src.title_company             || null,
  };
}

export default function PurchaseAgreementUpload({ onParsed }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | review | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
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
    setStatus("uploading");
    setErrorMsg("");

    // 1. Upload the file — get a permanent URL
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStatus("parsing");

    // 2. Pass the URL directly to Claude — it reads PDFs natively, including all pages.
    //    If the PDF has no text layer (scanned), Claude uses built-in OCR automatically.
    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: PS_PROMPT,
      file_urls: [file_url],
      response_json_schema: SCHEMA,
    });

    const data = result?.data || result;
    console.log("P&S AI extraction:", data);

    if (!data || typeof data !== "object") {
      setErrorMsg("Could not extract data from this document. Please check the file and try again.");
      setStatus("error");
      return;
    }

    setExtractedData(data);
    setStatus("review");
  };

  const handleConfirm = (reviewedFields) => {
    const src = { ...extractedData, ...reviewedFields };
    setStatus("done");
    setExtractedData(null);
    onParsed(normalizeExtracted(src));
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
            AI is reading your P&amp;S — extracting all pages, parties &amp; deadlines...
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

        {/* Process button */}
        {file && status === "idle" && (
          <Button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
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