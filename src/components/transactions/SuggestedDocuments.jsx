import React from "react";
import { Lightbulb, FileText } from "lucide-react";

const SUGGESTIONS = {
  residential: ["Property Disclosure", "Lead Paint Disclosure"],
  condo: ["Condo Resale Certificate", "Condo Rules & Regulations", "Property Disclosure"],
  land: ["Septic Design", "Survey", "Wetlands Disclosure"],
  commercial: ["Environmental Reports", "Lease Documents"],
  multi_family: ["Rental Income Statements", "Tenant Estoppel Certificates", "Environmental Reports"],
  other: ["Property Disclosure"],
};

const PROPERTY_TYPE_LABELS = {
  residential: "Residential",
  condo: "Condo",
  land: "Land",
  commercial: "Commercial",
  multi_family: "Multi-Family",
  other: "Other",
};

export default function SuggestedDocuments({ propertyType, uploadedFileNames = [] }) {
  if (!propertyType) return null;

  const suggested = SUGGESTIONS[propertyType] || [];
  // Filter out docs that appear to already be uploaded (loose name match)
  const filtered = suggested.filter(
    (s) => !uploadedFileNames.some((name) =>
      name?.toLowerCase().replace(/[\s_-]/g, "").includes(s.toLowerCase().replace(/[\s_-]/g, ""))
    )
  );

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold text-amber-800">
          Suggested Documents — {PROPERTY_TYPE_LABELS[propertyType]}
        </p>
        <span className="text-xs text-amber-600 ml-1">guidance only</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filtered.map((doc) => (
          <div key={doc} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-3 py-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-900">{doc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}