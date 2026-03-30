import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PenLine, Shield, ChevronDown, ChevronUp, Users, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import SignatureStatusBadge from "./SignatureStatusBadge";
import SignatureAuditTrailModal from "./SignatureAuditTrailModal";

export default function SignatureRequestsPanel({ transactionId }) {
  const [expanded, setExpanded] = useState(true);
  const [auditModal, setAuditModal] = useState(null); // { id, name }

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["sig-requests", transactionId],
    queryFn: () => base44.functions.invoke("signatureService", { action: "list", transaction_id: transactionId })
      .then(r => r.data?.requests || []),
    enabled: !!transactionId,
  });

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <>
      {auditModal && (
        <SignatureAuditTrailModal
          requestId={auditModal.id}
          documentName={auditModal.name}
          onClose={() => setAuditModal(null)}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
          style={{ background: "var(--bg-tertiary)" }}
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-2.5">
            <PenLine className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Signature Requests</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{requests.length}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
        </button>

        {expanded && (
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {requests.map(req => (
              <div key={req.id} className="px-4 py-3 flex flex-col gap-2" style={{ background: "var(--card-bg)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{req.document_name}</p>
                    {req.sent_at && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                        <Clock className="w-3 h-3" />
                        Sent {format(parseISO(req.sent_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <SignatureStatusBadge status={req.status} />
                </div>

                {/* Signers mini-list */}
                {req.signers?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.signers.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "signed" ? "bg-green-500" : s.status === "viewed" ? "bg-yellow-400" : "bg-gray-300"}`} />
                        <span>{s.name}</span>
                        <span className="capitalize text-[10px]" style={{ color: "var(--text-muted)" }}>({s.status || "pending"})</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setAuditModal({ id: req.id, name: req.document_name })}
                  className="flex items-center gap-1.5 text-xs font-medium self-start transition-colors"
                  style={{ color: "var(--accent)" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <Shield className="w-3.5 h-3.5" /> View Audit Trail
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}