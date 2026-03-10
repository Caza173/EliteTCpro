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

const PS_PROMPT = `You are reading a New Hampshire Association of REALTORS Purchase and Sales Agreement.

This document follows the standard NHAR structure with numbered sections. Extract key transaction data by reading the specific sections listed below.

Do not guess values. Return null for any field not explicitly found in the document.

SECTION 1 – PARTIES
Find the names labeled (SELLER) and (BUYER).
- buyer_names: full name(s) of buyer(s)
- seller_names: full name(s) of seller(s)

PROPERTY INFORMATION
Locate the line containing "located at".
- property_address: full street address including city, state, zip

SECTION 3 – SELLING PRICE
Locate "The SELLING PRICE is" — extract purchase_price as a number.
Locate "deposit of earnest money" — extract deposit_amount as a number.

SECTION 5 – TRANSFER OF TITLE
Find "TRANSFER OF TITLE" — extract closing_date as ISO date (YYYY-MM-DD).
Also extract closing_location if stated.

SECTION 7 – REPRESENTATION
Extract agent information:
- buyer_agent_name: agent representing the buyer
- buyer_brokerage: brokerage firm representing the buyer
- seller_agent_name: agent representing the seller (listing agent)
- seller_brokerage: brokerage firm representing the seller

SECTION 15 – INSPECTIONS
If inspection timelines are written as "within X days" — extract inspection_days as integer.
Also extract if present: general_building_inspection_days, sewage_inspection_days, water_quality_inspection_days, radon_inspection_days.

SECTION 16 – DUE DILIGENCE
Find "within X days from the effective date" — extract due_diligence_days as integer.

SECTION 19 – FINANCING
Find "Financing Deadline" — extract financing_commitment_date as ISO date.
Also extract: loan_amount (number), loan_type (string), loan_term (string).

SECTION 20 – ADDITIONAL PROVISIONS
Extract the full text under PROFESSIONAL FEE — return as commission_terms_raw.
Also interpret:
- buyer_agent_commission_percent: numeric percent if found (e.g. 2.5 for "2.5%")
- buyer_agent_commission_amount: flat dollar amount if found
- seller_concession_amount: any seller concession dollar amount
- section_20_full_text: verbatim full text of the entire Section 20

EFFECTIVE DATE
Locate the date near the signature block or page 1 labeled "EFFECTIVE DATE" — extract as acceptance_date (ISO date YYYY-MM-DD).

Also extract earnest_money_days: integer days from effective date for deposit due (if stated as offset rather than a fixed date).

Return as a single flat JSON object. All dates must be ISO format (YYYY-MM-DD). Numbers must be plain numbers, not strings.`;



const SCHEMA = {
  type: "object",
  properties: {
    // Parties
    buyer_names: { type: "string" },
    seller_names: { type: "string" },
    // Property
    property_address: { type: "string" },
    // Financials
    purchase_price: { type: "number" },
    deposit_amount: { type: "number" },
    // Dates
    acceptance_date: { type: "string" },
    closing_date: { type: "string" },
    closing_location: { type: "string" },
    financing_commitment_date: { type: "string" },
    // Deadlines (days offsets)
    earnest_money_days: { type: "number" },
    inspection_days: { type: "number" },
    due_diligence_days: { type: "number" },
    general_building_inspection_days: { type: "number" },
    sewage_inspection_days: { type: "number" },
    water_quality_inspection_days: { type: "number" },
    radon_inspection_days: { type: "number" },
    // Agents
    buyer_agent_name: { type: "string" },
    buyer_brokerage: { type: "string" },
    seller_agent_name: { type: "string" },
    seller_brokerage: { type: "string" },
    // Financing
    loan_amount: { type: "number" },
    loan_type: { type: "string" },
    loan_term: { type: "string" },
    // Commission / Section 20
    commission_terms_raw: { type: "string" },
    buyer_agent_commission_percent: { type: "number" },
    buyer_agent_commission_amount: { type: "number" },
    seller_concession_amount: { type: "number" },
    section_20_full_text: { type: "string" },
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
    const src = { ...extractedData, ...reviewedFields };
    // Normalize snake_case AI output → camelCase fields used by the rest of the app
    const normalized = {
      // Parties
      buyerName:                src.buyer_names               || src.buyerName               || null,
      sellerName:               src.seller_names              || src.sellerName              || null,
      // Property
      propertyAddress:          src.property_address          || src.propertyAddress          || null,
      // Dates
      effectiveDate:            src.acceptance_date           || src.effectiveDate            || null,
      closingDate:              src.closing_date              || src.closingDate              || null,
      closingLocation:          src.closing_location          || null,
      financingCommitmentDate:  src.financing_commitment_date || src.financingCommitmentDate  || null,
      // Direct deadline dates (if AI returned them)
      inspectionDeadline:       src.inspectionDeadline        || null,
      earnestMoneyDeadline:     src.earnestMoneyDeadline      || null,
      dueDiligenceDeadline:     src.dueDiligenceDeadline      || null,
      // Day offsets
      earnestMoneyDays:         src.earnest_money_days        ?? src.earnestMoneyDays         ?? null,
      inspectionDays:           src.inspection_days           ?? src.inspectionDays           ?? null,
      dueDiligenceDays:         src.due_diligence_days        ?? src.dueDiligenceDays         ?? null,
      generalBuildingInspectionDays: src.general_building_inspection_days ?? src.generalBuildingInspectionDays ?? null,
      sewageInspectionDays:     src.sewage_inspection_days    ?? src.sewageInspectionDays     ?? null,
      waterQualityInspectionDays: src.water_quality_inspection_days ?? src.waterQualityInspectionDays ?? null,
      radonInspectionDays:      src.radon_inspection_days     ?? src.radonInspectionDays      ?? null,
      // Financials
      purchasePrice:            src.purchase_price            ?? src.purchasePrice            ?? null,
      depositAmount:            src.deposit_amount            ?? src.depositAmount            ?? null,
      // Agents
      buyersAgentName:          src.buyer_agent_name          || src.buyersAgentName          || null,
      sellersAgentName:         src.seller_agent_name         || src.sellersAgentName         || null,
      buyerBrokerage:           src.buyer_brokerage           || src.buyerBrokerage           || null,
      sellerBrokerage:          src.seller_brokerage          || src.sellerBrokerage          || null,
      closingTitleCompany:      src.closingTitleCompany       || null,
      // Financing details
      loanAmount:               src.loan_amount               || null,
      loanType:                 src.loan_type                 || null,
      loanTerm:                 src.loan_term                 || null,
      // Section 20 / Commission
      section20ProfessionalFee:       src.commission_terms_raw        || src.section20ProfessionalFee      || null,
      section20AdditionalProvisions:  src.section_20_full_text        || src.section20AdditionalProvisions || null,
      professionalFeeValue:           src.buyer_agent_commission_percent ?? src.professionalFeeValue ?? null,
      professionalFeeType:            src.buyer_agent_commission_percent != null ? "percent" : (src.buyer_agent_commission_amount != null ? "flat" : null),
      sellerConcessionAmount:         src.seller_concession_amount    ?? src.sellerConcessionAmount        ?? null,
      additionalCompensationNotes:    src.commission_terms_raw        || null,
    };
    setStatus("done");
    setExtractedData(null);
    onParsed(normalized);
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