/**
 * SignatureBlockBanner
 * Shows a warning banner when a transaction is blocked by pending signatures.
 * Includes option to mark docs as signed externally (e.g. via Dotloop).
 */
import React, { useState } from "react";
import { AlertTriangle, PenLine, ChevronRight, CheckCircle2, X } from "lucide-react";
import { signatureRequestsApi } from "@/api/signatureRequests";
import { useQueryClient } from "@tanstack/react-query";

export default function SignatureBlockBanner({ blockingDocuments = [], onSendSignature, transaction }) {
  const [markingId, setMarkingId] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  if (!blockingDocuments || blockingDocuments.length === 0 || dismissed) return null;

  const handleMarkSigned = async (doc) => {
    setMarkingId(doc.document_id);
    try {
      await signatureRequestsApi.markCompletedExternal({
        transaction_id: transaction?.id,
        document_id: doc.document_id,
        title: doc.document_name,
      });

      queryClient.invalidateQueries({ queryKey: ["signatures", transaction?.id] });
      queryClient.invalidateQueries({ queryKey: ["transaction", transaction?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } finally {
      setMarkingId(null);
    }
  };

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
          If these documents were signed externally (e.g. Dotloop, DocuSign), mark them as signed below.
        </p>
        <div className="mt-2 space-y-1.5">
          {blockingDocuments.map((doc) => (
            <div key={doc.document_id} className="flex items-center gap-2 text-xs flex-wrap">
              <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--danger)" }} />
              <span style={{ color: "var(--danger)" }}>
                <span className="font-medium">{doc.document_name}</span>
                {" — "}
                <span className="capitalize">
                  {doc.signature_status === "not_sent" ? "Not sent for signature" : `Status: ${doc.signature_status}`}
                </span>
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                {onSendSignature && doc.signature_status === "not_sent" && (
                  <button
                    onClick={() => onSendSignature(doc)}
                    className="flex items-center gap-1 font-semibold underline"
                    style={{ color: "var(--danger)" }}
                  >
                    <PenLine className="w-3 h-3" /> Send Now
                  </button>
                )}
                <button
                  onClick={() => handleMarkSigned(doc)}
                  disabled={markingId === doc.document_id}
                  className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border transition-colors"
                  style={{
                    borderColor: "#16a34a",
                    color: "#16a34a",
                    backgroundColor: "rgba(22,163,74,0.08)",
                    opacity: markingId === doc.document_id ? 0.6 : 1,
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {markingId === doc.document_id ? "Saving…" : "Mark as Signed (External)"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-0.5 rounded hover:opacity-60 transition-opacity"
        style={{ color: "var(--danger)" }}
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}