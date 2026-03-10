import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

const FIELDS = [
  { key: "propertyAddress",        label: "Property Address" },
  { key: "buyerName",              label: "Buyer Name(s)" },
  { key: "sellerName",             label: "Seller Name(s)" },
  { key: "effectiveDate",          label: "Acceptance / Effective Date",  type: "date" },
  { key: "closingDate",            label: "Closing / Transfer of Title",  type: "date" },
  { key: "inspectionDeadline",     label: "Inspection Deadline",          type: "date" },
  { key: "financingCommitmentDate",label: "Financing Commitment Date",    type: "date" },
  { key: "earnestMoneyDeadline",   label: "Earnest Money Due Date",       type: "date" },
  { key: "dueDiligenceDeadline",   label: "Due Diligence Deadline",       type: "date" },
  { key: "purchasePrice",          label: "Purchase Price",               type: "number" },
  { key: "buyersAgentName",        label: "Buyer's Agent" },
  { key: "buyerBrokerage",         label: "Buyer Brokerage" },
  { key: "sellersAgentName",       label: "Seller's Agent" },
  { key: "sellerBrokerage",        label: "Seller Brokerage" },
  { key: "closingTitleCompany",    label: "Title / Closing Company" },
];

export default function PSReviewModal({ extracted, onConfirm, onCancel }) {
  const [fields, setFields] = useState(() => {
    const init = {};
    FIELDS.forEach(({ key }) => { init[key] = extracted?.[key] ?? ""; });
    return init;
  });

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }));

  const hasAnyData = FIELDS.some(({ key }) => !!fields[key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Review Extracted Data</h2>
              <p className="text-xs text-gray-500 mt-0.5">Verify and correct the fields extracted from your P&S before creating the transaction.</p>
            </div>
          </div>
          {hasAnyData ? (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Data extracted successfully — review and confirm below.
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Limited data was extracted — please fill in the fields manually.
            </div>
          )}
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, type }) => (
              <div key={key} className={key === "propertyAddress" ? "sm:col-span-2" : ""}>
                <Label className="text-xs font-medium text-gray-600">{label}</Label>
                <Input
                  type={type || "text"}
                  value={fields[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className={`mt-1 h-8 text-sm ${fields[key] ? "border-emerald-300 bg-emerald-50/30" : ""}`}
                />
              </div>
            ))}
          </div>

          {/* Section 20 raw text if available */}
          {extracted?.section20AdditionalProvisions && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1">Section 20 — Additional Provisions (raw)</p>
              <p className="text-xs text-amber-700 whitespace-pre-wrap line-clamp-4">{extracted.section20AdditionalProvisions}</p>
            </div>
          )}
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