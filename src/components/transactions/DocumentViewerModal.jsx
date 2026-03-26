import React, { useState } from "react";
import { X, Download, ExternalLink, FileText, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DOC_LABELS = {
  purchase_and_sale: "Purchase & Sale",
  listing_agreement: "Listing Agreement",
  addendum: "Addendum",
  buyer_agency_agreement: "Buyer Agency",
  disclosure: "Disclosure",
  inspection: "Inspection",
  appraisal: "Appraisal",
  title: "Title",
  closing: "Closing",
  other: "Other",
};

const TYPE_COLORS = {
  purchase_and_sale: "bg-blue-50 text-blue-700 border-blue-200",
  listing_agreement: "bg-emerald-50 text-emerald-700 border-emerald-200",
  addendum: "bg-amber-50 text-amber-700 border-amber-200",
  buyer_agency_agreement: "bg-purple-50 text-purple-700 border-purple-200",
  disclosure: "bg-orange-50 text-orange-700 border-orange-200",
  inspection: "bg-cyan-50 text-cyan-700 border-cyan-200",
  appraisal: "bg-indigo-50 text-indigo-700 border-indigo-200",
  title: "bg-teal-50 text-teal-700 border-teal-200",
  closing: "bg-rose-50 text-rose-700 border-rose-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function DocumentViewerModal({ doc, onClose, onAttachToEmail }) {
  const [iframeError, setIframeError] = useState(false);

  if (!doc) return null;

  const isPdf = doc.file_name?.toLowerCase().endsWith(".pdf") || doc.file_url?.toLowerCase().includes(".pdf");
  const docTypeLabel = DOC_LABELS[doc.doc_type] || doc.doc_type || "Other";
  const docTypeColor = TYPE_COLORS[doc.doc_type] || TYPE_COLORS.other;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-5xl" style={{ height: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">{doc.file_name || "Document"}</span>
            {doc.doc_type && (
              <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${docTypeColor}`}>
                {docTypeLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {onAttachToEmail && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => onAttachToEmail(doc)}>
                <Mail className="w-3.5 h-3.5" /> Attach to Email
              </Button>
            )}
            <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </a>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Tab
              </Button>
            </a>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-500 hover:text-gray-900">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100 rounded-b-xl">
          {iframeError || !isPdf ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
              <AlertCircle className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">Preview not available for this file type.</p>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <ExternalLink className="w-4 h-4" /> Open File
                </Button>
              </a>
            </div>
          ) : (
            <iframe
              src={doc.file_url}
              className="w-full h-full rounded-b-xl border-0"
              title={doc.file_name}
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}