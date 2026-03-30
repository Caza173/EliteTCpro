import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Copy, CheckCircle, Mail, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

const STATUS_COLORS = {
  sent: "bg-blue-100 text-blue-700",
  responded_yes: "bg-green-100 text-green-700",
  responded_no: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
};

const INTERVAL_COLORS = {
  "4h": "bg-red-100 text-red-700",
  "24h": "bg-orange-100 text-orange-700",
  "48h": "bg-amber-100 text-amber-700",
  "72h": "bg-yellow-100 text-yellow-700",
  "overdue": "bg-red-200 text-red-800",
};

export default function AIActivityLogPanel() {
  const [copiedId, setCopiedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["aiActivityLog"],
    queryFn: () => base44.entities.AIActivityLog.list("-created_date", 20),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (logs.length === 0) return null;

  const visible = expanded ? logs : logs.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Superagent Activity
        </span>
        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{logs.length}</Badge>
      </div>

      {visible.map((log) => (
        <div
          key={log.id}
          className="p-3 rounded-lg border"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {log.deadline_label || log.deadline_type} — {log.transaction_address}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Mail className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {log.recipient_name || log.recipient_email}
                </span>
                {log.created_date && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    · {formatDistanceToNow(parseISO(log.created_date), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {log.interval_label && (
                <Badge className={`text-[10px] px-1.5 py-0 ${INTERVAL_COLORS[log.interval_label] || "bg-gray-100"}`}>
                  {log.interval_label}
                </Badge>
              )}
              <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[log.response_status] || "bg-gray-100"}`}>
                {log.response_status}
              </Badge>
            </div>
          </div>

          {(log.subject || log.message) && (
            <div className="mt-2">
              <button
                onClick={() => setExpandedEmail(expandedEmail === log.id ? null : log.id)}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
              >
                <Mail className="w-3 h-3" />
                {expandedEmail === log.id ? "Hide Email" : "View Email"}
                {expandedEmail === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedEmail === log.id && (
                <div className="mt-2 rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
                  {log.subject && (
                    <div className="px-3 py-2 border-b text-[11px] font-semibold" style={{ backgroundColor: "var(--bg-tertiary)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                      Subject: {log.subject}
                    </div>
                  )}
                  {log.message && (
                    <div className="px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-primary)" }}>
                      {log.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {log.addendum_draft && (
            <div className="mt-2 p-2 rounded border" style={{ backgroundColor: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                Draft Addendum Language
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{log.addendum_draft}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-1.5 h-6 text-[11px] px-2 text-blue-600 hover:text-blue-700"
                onClick={() => handleCopy(log.id, log.addendum_draft)}
              >
                {copiedId === log.id
                  ? <><CheckCircle className="w-3 h-3 mr-1" />Copied!</>
                  : <><Copy className="w-3 h-3 mr-1" />Copy Text</>}
              </Button>
            </div>
          )}

          {log.transaction_id && (
            <Link
              to={`${createPageUrl("TransactionDetail")}?id=${log.transaction_id}`}
              className="inline-block mt-1.5 text-[11px] text-blue-500 hover:underline"
            >
              View Transaction →
            </Link>
          )}
        </div>
      ))}

      {logs.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs flex items-center justify-center gap-1 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show {logs.length - 3} more</>}
        </button>
      )}
    </div>
  );
}