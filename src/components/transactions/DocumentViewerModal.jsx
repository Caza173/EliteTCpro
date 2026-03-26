import React, { useState } from "react";
import { X, Download, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentViewerModal({ doc, onClose }) {
  const [iframeError, setIframeError] = useState(false);

  if (!doc) return null;

  const isPdf = doc.file_name?.toLowerCase().endsWith(".pdf") || doc.file_url?.includes(".pdf");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-5xl" style={{ height: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">{doc.file_name || "Document"}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
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