import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PurchaseAgreementUpload({ onParsed }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) {
      setErrorMsg("Only PDF or DOCX files are supported.");
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
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    // 1. Upload the file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStatus("parsing");

    // 2. Send to LLM for extraction
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate contract parser specializing in the New Hampshire Association of REALTORS® (NHAR) Purchase and Sales Agreement.

Analyze this document and extract the following fields. Return ONLY valid JSON, no explanation.

Fields to extract:
- effectiveDate: ISO date string (YYYY-MM-DD) or null
- closingDate: ISO date string (YYYY-MM-DD) or null
- transferOfTitleDate: ISO date string (YYYY-MM-DD) or null
- earnestMoneyDays: integer (days from effective date) or null
- additionalDepositDate: ISO date string or null
- inspectionDays: integer (total inspection period days) or null
- generalBuildingInspectionDays: integer or null
- sewageInspectionDays: integer or null
- waterQualityInspectionDays: integer or null
- radonInspectionDays: integer or null
- dueDiligenceDays: integer or null
- financingCommitmentDate: ISO date string or null
- purchasePrice: number or null
- buyerName: string or null (full name of buyer(s))
- sellerName: string or null (full name of seller(s))
- buyersAgentName: string or null
- sellersAgentName: string or null
- buyerBrokerage: string or null
- sellerBrokerage: string or null
- closingTitleCompany: string or null
- propertyAddress: string or null
- section20AdditionalProvisions: string or null (verbatim text from "Additional Provisions" section)
- section20Concessions: string or null (verbatim text from "Concessions" section)
- section20ProfessionalFee: string or null (verbatim text from "Professional Fee" section)
- professionalFeeType: "percent" or "flat" or null (detected from Professional Fee / Additional Provisions / Concessions sections)
- professionalFeeValue: number or null (the numeric value — e.g. 2 for "2%", or 5000 for "$5,000")
- professionalFeeBase: "contract_price" or "sale_price" or "flat" or null
- sellerConcessionAmount: number or null (flat dollar amount of any seller concession found)
- sellerConcessionPercent: number or null (percent-based concession if applicable)
- additionalCompensationNotes: string or null (any other free-text compensation language detected)

Look for patterns like:
- "EFFECTIVE DATE", "Effective Date of this Agreement"
- "TRANSFER OF TITLE: On or before"
- "within ___ days of the EFFECTIVE DATE"
- "Inspection within ___ days"
- "General Building within ___ days"
- "Sewage Disposal within ___ days"
- "Water Quality within ___ days"
- "Radon Air Quality within ___ days"
- "Due Diligence"
- "Financing Deadline", "Financing Commitment", "Financial Commitment Date"
- "PURCHASE PRICE"
- "Buyer's Agent", "Listing Agent", "Seller's Agent"
- "Closing Agent", "Title Company", "Settlement Agent"
- Brokerage names near agent names
- Section 20: "ADDITIONAL PROVISIONS", "CONCESSIONS", "PROFESSIONAL FEE"
- Financial patterns: "X% of the net contract price", "X% commission", "Seller shall pay", "buyer broker", "$X,XXX", "X% of sale price"
- Concession patterns: "seller concession", "closing cost credit", "seller to pay"

If a field is not found, return null for that field.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          effectiveDate: { type: "string" },
          closingDate: { type: "string" },
          transferOfTitleDate: { type: "string" },
          earnestMoneyDays: { type: "number" },
          additionalDepositDate: { type: "string" },
          inspectionDays: { type: "number" },
          generalBuildingInspectionDays: { type: "number" },
          sewageInspectionDays: { type: "number" },
          waterQualityInspectionDays: { type: "number" },
          radonInspectionDays: { type: "number" },
          dueDiligenceDays: { type: "number" },
          financingCommitmentDate: { type: "string" },
          purchasePrice: { type: "number" },
          buyerName: { type: "string" },
          sellerName: { type: "string" },
          buyersAgentName: { type: "string" },
          sellersAgentName: { type: "string" },
          buyerBrokerage: { type: "string" },
          sellerBrokerage: { type: "string" },
          closingTitleCompany: { type: "string" },
          propertyAddress: { type: "string" },
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
      },
    });

    setStatus("done");
    onParsed(result);
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const isProcessing = status === "uploading" || status === "parsing";

  return (
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
            <p className="text-sm font-medium text-gray-700">Drop your P&amp;S Agreement here</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF or DOCX — click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
          Scanning P&amp;S Agreement for deadlines, fees &amp; Section 20 clauses...
        </div>
      )}
      {status === "done" && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          Deadlines detected and applied to transaction.
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {errorMsg || "An error occurred. Please try again."}
        </div>
      )}

      {/* Action button */}
      {file && status === "idle" && (
        <Button
          type="button"
          onClick={handleProcess}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Scan &amp; Auto-Fill Deadlines
        </Button>
      )}
    </div>
  );
}