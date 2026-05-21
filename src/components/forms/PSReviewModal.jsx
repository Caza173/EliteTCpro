import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Edit3, Zap, AlertTriangle } from "lucide-react";

const FIELDS = [
  { key: "property_address",          label: "Property Address",              span: true },
  { key: "buyer_names",               label: "Buyer Name(s)" },
  { key: "seller_names",              label: "Seller Name(s)" },
  { key: "acceptance_date",           label: "Acceptance / Effective Date",   type: "date" },
  { key: "closing_date",              label: "Closing Date",                  type: "date" },
  { key: "earnest_money_deadline",    label: "Earnest Money Deadline",        type: "date" },
  { key: "inspection_deadline",       label: "Inspection Deadline",           type: "date" },
  { key: "due_diligence_deadline",    label: "Due Diligence Deadline",        type: "date" },
  { key: "financing_commitment_date", label: "Financing Commitment Date",     type: "date" },
  { key: "purchase_price",            label: "Purchase Price",                type: "number" },
  { key: "deposit_amount",            label: "Deposit / Earnest Money",       type: "number" },
  { key: "buyer_agent",               label: "Buyer's Agent" },
  { key: "buyer_brokerage",           label: "Buyer Brokerage" },
  { key: "seller_agent",              label: "Seller's Agent" },
  { key: "seller_brokerage",          label: "Seller Brokerage" },
  { key: "title_company",             label: "Title / Closing Company" },
];

// Fields that map to deadline confidence entries in _debug.confidence_summary
const DEADLINE_CONFIDENCE_MAP = {
  earnest_money_deadline:    'earnest_money',
  inspection_deadline:       'inspection',
  due_diligence_deadline:    'due_diligence',
  financing_commitment_date: 'financing',
  acceptance_date:           'effective_date',
};

function ConfidencePill({ level }) {
  if (!level) return null;
  if (level === 'HIGH') return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium ml-1">HIGH</span>
  );
  if (level === 'MEDIUM') return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium ml-1">MED</span>
  );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium ml-1">LOW</span>
  );
}

export default function PSReviewModal({ extracted, onConfirm, onCancel }) {
  const [fields, setFields] = useState(() => {
    const init = {};
    FIELDS.forEach(({ key }) => { init[key] = extracted?.[key] ?? ""; });
    return init;
  });

  const debug = extracted?._debug || {};
  const confidenceSummary = debug.confidence_summary || {};
  const pipeline = debug.pipeline || 'unknown';
  const flags = debug.flags || [];
  const validationErrors = extracted?.validation_errors || [];
  const textractMeta = debug.textract || null;

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }));

  const hasAnyData = FIELDS.some(({ key }) => !!fields[key]);
  const hasWarnings = flags.length > 0 || validationErrors.length > 0;

  const getFieldConfidence = (key) => {
    const cKey = DEADLINE_CONFIDENCE_MAP[key];
    if (cKey) return confidenceSummary[cKey];
    // For party/financial fields, derive from whether value exists
    if (fields[key]) return 'HIGH';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Review Extracted Data</h2>
              <p className="text-xs text-gray-500 mt-0.5">Verify and correct fields before creating the transaction.</p>
            </div>
          </div>

          {/* Pipeline badge */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {pipeline === 'textract+gpt4.1' ? (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                <Zap className="w-3 h-3" />
                Textract + GPT-4.1
                {textractMeta && (
                  <span className="ml-1 text-blue-400">
                    · {textractMeta.pages}p · {textractMeta.kv_pairs} fields · {textractMeta.avg_word_confidence}% conf
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Vision fallback (Textract unavailable)
              </span>
            )}
          </div>

          {/* Status banner */}
          {hasAnyData ? (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Data extracted — review highlighted fields before confirming.
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Limited data extracted — fill in the fields manually.
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span><strong>{err.field}:</strong> {err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, type, span }) => {
              const conf = getFieldConfidence(key);
              const isEmpty = !fields[key];
              const hasError = validationErrors.some(e => e.field === key);
              return (
                <div key={key} className={span ? "sm:col-span-2" : ""}>
                  <Label className="text-xs font-medium text-gray-600 flex items-center">
                    {label}
                    <ConfidencePill level={conf} />
                    {hasError && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium ml-1">⚠ Check</span>}
                  </Label>
                  <Input
                    type={type || "text"}
                    value={fields[key] || ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className={`mt-1 h-8 text-sm ${
                      hasError      ? "border-red-300 bg-red-50/30" :
                      !isEmpty      ? "border-emerald-300 bg-emerald-50/30" :
                                      "border-amber-200 bg-amber-50/20 placeholder:text-amber-500"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(fields)}
            className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Confirm &amp; Apply to Transaction
          </Button>
        </div>
      </div>
    </div>
  );
}