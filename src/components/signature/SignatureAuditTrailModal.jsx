import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Shield, Clock, User, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";

const EVENT_ICONS = {
  created:   { icon: "📝", color: "text-gray-500" },
  sent:      { icon: "📤", color: "text-blue-500" },
  viewed:    { icon: "👁️", color: "text-yellow-500" },
  signed:    { icon: "✍️", color: "text-green-600" },
  completed: { icon: "✅", color: "text-green-700" },
  declined:  { icon: "❌", color: "text-red-500" },
  cancelled: { icon: "🚫", color: "text-gray-400" },
};

export default function SignatureAuditTrailModal({ requestId, documentName, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sig-audit", requestId],
    queryFn: () => base44.functions.invoke("signatureService", { action: "audit", request_id: requestId })
      .then(r => r.data?.events || []),
    enabled: !!requestId,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-lg" style={{ background: "var(--card-bg)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Audit Trail</h2>
              <p className="text-xs truncate max-w-48" style={{ color: "var(--text-muted)" }}>{documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Events */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : !data?.length ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No audit events recorded.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4 pl-10">
                {data.map((event, i) => {
                  const cfg = EVENT_ICONS[event.event_type] || EVENT_ICONS.created;
                  return (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[10px]">
                        {cfg.icon}
                      </div>
                      <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold capitalize ${cfg.color}`}>
                            {event.event_type}
                          </span>
                          {event.timestamp && (
                            <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                              <Clock className="w-3 h-3" />
                              {format(parseISO(event.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          )}
                        </div>
                        {(event.signer_name || event.signer_email) && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <User className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                              {event.signer_name || event.signer_email}
                              {event.signer_name && event.signer_email && ` (${event.signer_email})`}
                            </span>
                          </div>
                        )}
                        {event.ip_address && event.ip_address !== "unknown" && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                            <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>IP: {event.ip_address}</span>
                          </div>
                        )}
                        {event.notes && (
                          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{event.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}