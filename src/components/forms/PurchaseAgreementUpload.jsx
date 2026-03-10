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

// Precise NHAR P&S extraction prompt
const PS_PROMPT = `You are extracting structured data from a New Hampshire Purchase and Sales Agreement (NHAR standard form).

READ EVERY PAGE of the document carefully before responding.

Return a single JSON object with these exact fields. Dates must be ISO format (YYYY-MM-DD). Numbers must be plain numbers. Return null for missing fields — do NOT guess.

---

buyer_names: The BUYER name(s) from Section 1. In this form the layout is:
  "THIS AGREEMENT made this [day] day of [month], [year] between [SELLER NAME] ("SELLER") ... and [BUYER NAME] ("BUYER")"
  The SELLER appears FIRST, the BUYER appears SECOND after "and".
  Example: if you see "Roger Perry Jr. (SELLER)... and Elizabeth Todd (BUYER)" → buyer_names = "Elizabeth Todd", seller_names = "Roger Perry Jr."

seller_names: The SELLER name(s) from Section 1. See above — SELLER appears first in the agreement text.

property_address: Full property address from Section 2. Look for "located at [address]" in the WITNESSETH clause. Include city and state.

purchase_price: Dollar amount from Section 3. "The SELLING PRICE is [words] Dollars $[number]" → return as a number (e.g. 540000).

deposit_amount: Initial earnest money deposit from Section 3. "a deposit of earnest money in the amount of $[number]" → return as a number.

earnest_money_days: Number of days from the effective date for the deposit to be delivered. "within [X] days of the EFFECTIVE DATE" in Section 3 → return the integer X.

acceptance_date: The EFFECTIVE DATE shown in the top-right box on page 1, labeled "EFFECTIVE DATE". Return as ISO date.

closing_date: The date from Section 5 "TRANSFER OF TITLE: On or before [date]". Return as ISO date.

inspection_deadline: COMPUTE this. Look in Section 15 for "General Building within [X] days". Add X days to the acceptance_date and return the resulting ISO date.

inspection_days: The number of days for the General Building inspection from Section 15. Return as integer.

due_diligence_days: From Section 16 "BUYER must notify SELLER in writing within [X] days". Return as integer.

financing_commitment_date: From Section 19 "Financing Deadline" date. Return as ISO date.

buyer_agent: From Section 7 REPRESENTATION. The agent checked as "buyer agent". 
  In NHAR form, each agent line says "[Name] of [Firm] is a [seller agent / buyer agent / ...]"
  Return the name of whichever agent is checked as "buyer agent".

seller_agent: From Section 7. The agent checked as "seller agent". Return their name.

buyer_brokerage: The firm associated with the buyer agent from Section 7.

seller_brokerage: The firm associated with the seller agent from Section 7.

title_company: The escrow/closing company. Look for "ESCROW AGENT" in Section 3 or the closing location in Section 5.

---

CRITICAL REMINDERS:
- In NHAR form: SELLER is listed FIRST, BUYER is listed SECOND (after "and"). Do not mix them up.
- The EFFECTIVE DATE box is in the top-right of page 1.
- inspection_deadline must be a computed ISO date (acceptance_date + inspection_days), not just the number of days.
- Return all values in a flat JSON object with the exact field names listed above.`;

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
    inspection_days:           { type: "number" },
    earnest_money_days:        { type: "number" },
    due_diligence_days:        { type: "number" },
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