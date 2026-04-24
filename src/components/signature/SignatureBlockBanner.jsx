/**
 * SignatureBlockBanner
 * Shows a warning banner when a transaction is blocked by pending signatures.
 * Displayed in TransactionDetail phase progression area.
 */
import React from "react";
import { AlertTriangle, PenLine, ChevronRight } from "lucide-react";

export default function SignatureBlockBanner({ blockingDocuments = [], onSendSignature }) {
  if (!blockingDocuments || blockingDocuments.length === 0) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 border"
      style={{
        backgroundColor: "var(--danger-bg)",
        borderColor: "#fca5a5",
      }}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
          Signature Required — Phase Progression Blocked
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--danger)" }}>
          This transaction cannot move forward until required signatures are completed.
        </p>
        <div className="mt-2 space-y-1">
          {blockingDocuments.map((doc) => (
            <div key={doc.document_id} className="flex items-center gap-2 text-xs">
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--danger)" }} />
              <span style={{ color: "var(--danger)" }}>
                <span className="font-medium">{doc.document_name}</span>
                {" — "}
                <span className="capitalize">{doc.signature_status === "not_sent" ? "Not sent for signature" : `Status: ${doc.signature_status}`}</span>
              </span>
              {onSendSignature && doc.signature_status === "not_sent" && (
                <button
                  onClick={() => onSendSignature(doc)}
                  className="flex items-center gap-1 font-semibold underline ml-1"
                  style={{ color: "var(--danger)" }}
                >
                  <PenLine className="w-3 h-3" /> Send Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}