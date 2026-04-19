import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ExternalLink, AlertTriangle, Clock, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { generateSmartTasks } from "../transactions/defaultTasks";
import { generateTasksForPhase } from "../../lib/taskLibrary";

const STATUS_STYLES = {
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function generateCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = prefix + '-';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

export default function IntakePendingReviews({ currentUser }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["intake-submissions"],
    queryFn: () => base44.entities.IntakeSubmission.filter({ status: "pending_review" }, "-submitted_at"),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IntakeSubmission.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["intake-submissions"] }),
  });

  const handleApprove = async (sub) => {
    setProcessingId(sub.id);
    try {
      const fd = sub.form_data || {};
      const dealType = sub.deal_type;

      // Build tasks
      let tasks = [];
      if (dealType === "buyer_uc") {
        tasks = generateSmartTasks(null, fd.is_cash_transaction, fd);
        const phase1 = generateTasksForPhase(1, null, "buyer");
        const ids = new Set(tasks.map(t => t.id));
        tasks = [...tasks, ...phase1.filter(t => !ids.has(t.id))];
      } else if (dealType === "both") {
        tasks = generateTasksForPhase(1, null, "dual");
      }

      const txType = dealType === "listing" ? "seller"
        : dealType === "both" ? "dual"
        : dealType === "buyer_agency" ? "buyer"
        : "buyer";

      const txPhase = dealType === "listing" ? "listing_intake"
        : dealType === "buyer_agency" ? "intake"
        : "under_contract";

      // Create transaction as "pending" — waiting for a TC to claim it
      const res = await base44.functions.invoke("createTransaction", {
        ...fd,
        buyers: sub.buyers || [],
        sellers: sub.sellers || [],
        buyer: (sub.buyers || []).join(" & "),
        seller: (sub.sellers || []).join(" & "),
        client_email: (sub.client_emails || [])[0] || "",
        client_emails: sub.client_emails || [],
        agent: sub.agent_name || fd.agent || "",
        agent_email: sub.agent_email || fd.agent_email || "",
        address: sub.property_address || fd.address || "",
        transaction_type: txType,
        transaction_phase: txPhase,
        status: "pending",
        assigned_tc_id: null,
        assigned_tc_email: null,
        claimed_at: null,
        phase: 1,
        phases_completed: [],
        tasks,
        // Generate portal codes at approval time
        agent_code: generateCode("AGT"),
        client_code: generateCode("CLT"),
      });

      const txId = res?.data?.id;

      // Store document if present
      if (sub.document_url && txId) {
        await base44.entities.Document.create({
          transaction_id: txId,
          doc_type: dealType === "listing" ? "listing_agreement"
            : dealType === "buyer_agency" ? "buyer_agency_agreement"
            : "purchase_and_sale",
          file_url: sub.document_url,
          file_name: sub.document_name || "Submitted Document",
          uploaded_by: sub.agent_email,
          uploaded_by_role: "agent",
        });
      }

      await updateMutation.mutateAsync({
        id: sub.id,
        data: {
          status: "approved",
          reviewed_by: currentUser?.email,
          reviewed_at: new Date().toISOString(),
          transaction_id: txId || null,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      alert("Approval failed: " + (err.message || "Unknown error"));
    }
    setProcessingId(null);
  };

  const handleReject = async (sub) => {
    const notes = rejectNotes[sub.id] || "";
    setProcessingId(sub.id);
    await updateMutation.mutateAsync({
      id: sub.id,
      data: {
        status: "rejected",
        review_notes: notes,
        reviewed_by: currentUser?.email,
        reviewed_at: new Date().toISOString(),
      },
    });
    setProcessingId(null);
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 py-6 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading submissions…</div>;
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
        No pending intake submissions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map(sub => {
        const isExpanded = expandedId === sub.id;
        const isProcessing = processingId === sub.id;
        return (
          <div key={sub.id} className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {sub.property_address || "No address"}
                  </span>
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLES[sub.status]}`}>
                    {sub.status === "pending_review" ? "Pending Review" : sub.status}
                  </Badge>
                  {sub.is_generic_email && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Unverified Agent Email
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{sub.agent_name || sub.agent_email}</span>
                  <span>·</span>
                  <span className="capitalize">{sub.deal_type?.replace("_", " ")}</span>
                  {sub.submitted_at && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(sub.submitted_at), "MMM d, h:mm a")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {sub.document_url && (
                  <a href={sub.document_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="View document" style={{ color: "var(--text-muted)" }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: "var(--text-muted)" }}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--card-border)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 text-xs">
                  {[
                    ["Agent Email", sub.agent_email],
                    ["Agent Phone", sub.agent_phone || "—"],
                    ["Buyers", (sub.buyers || []).join(", ") || "—"],
                    ["Sellers", (sub.sellers || []).join(", ") || "—"],
                    ["Client Emails", (sub.client_emails || []).join(", ") || "—"],
                    ["Email Verified", sub.email_verified ? "✓ Yes" : "✗ No"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
                      <p className="mt-0.5" style={{ color: "var(--text-primary)" }}>{val}</p>
                    </div>
                  ))}
                </div>

                {sub.document_url && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border text-xs" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                    <FileText className="w-4 h-4 flex-shrink-0 text-blue-500" />
                    <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{sub.document_name || "Submitted document"}</span>
                    <a href={sub.document_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex-shrink-0">View</a>
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-xs resize-none outline-none"
                    style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                    rows={2}
                    placeholder="Review notes (required for rejection, optional for approval)…"
                    value={rejectNotes[sub.id] || ""}
                    onChange={e => setRejectNotes(p => ({ ...p, [sub.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      disabled={isProcessing} onClick={() => handleApprove(sub)}>
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve & Activate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                      disabled={isProcessing || !rejectNotes[sub.id]?.trim()} onClick={() => handleReject(sub)}>
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </Button>
                  </div>
                  {!rejectNotes[sub.id]?.trim() && (
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Add a note above to enable rejection</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}