/**
 * TaskEmailTrigger
 *
 * Shows an email action button on tasks that have a defined email template trigger.
 * Handles: generate draft → preview → send (manual review flow).
 *
 * Triggered tasks:
 *   - Earnest Money Sent / Received
 *   - Inspection Scheduled / Completed
 *   - Appraisal Ordered / Scheduled
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Send, Eye, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Tasks that trigger an email — must match patterns in taskEmailTrigger.js
const TRIGGERED_PATTERNS = [
  "earnest money sent",
  "earnest money deposit received",
  "inspection scheduled",
  "inspection(s) scheduled",
  "inspection completed",
  "appraisal ordered",
  "appraisal scheduled",
];

function hasEmailTrigger(taskTitle) {
  if (!taskTitle) return false;
  const lower = taskTitle.toLowerCase();
  return TRIGGERED_PATTERNS.some(p => lower.includes(p));
}

export default function TaskEmailTrigger({ task, transaction, currentUser, onTaskUpdated }) {
  const [loading, setLoading] = useState(false);
  const [comm, setComm] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!hasEmailTrigger(task.title)) return null;
  if (!task.is_completed) return null;

  // Already sent
  if (sent || comm?.template_status === "sent") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 flex-shrink-0">
        <CheckCircle2 className="w-3 h-3" /> Email Sent
      </span>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("taskEmailTrigger", {
        action: "generate",
        transaction_id: transaction.id,
        task_id: task.id,
        task_title: task.title,
      });
      if (res.data?.comm) {
        setComm(res.data.comm);
        setPreviewOpen(true);
      } else {
        toast.error("Could not generate email draft");
      }
    } catch (e) {
      toast.error(e.message || "Failed to generate email");
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!comm?.id) return;
    setSending(true);
    try {
      await base44.functions.invoke("taskEmailTrigger", {
        action: "send",
        transaction_id: transaction.id,
        comm_id: comm.id,
      });
      setSent(true);
      setPreviewOpen(false);
      setConfirmOpen(false);
      toast.success("Email sent successfully");
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e.message || "Failed to send email");
    }
    setSending(false);
  };

  return (
    <>
      {/* Trigger button — show on completed tasks with a template */}
      {!comm ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 gap-1 flex-shrink-0"
          onClick={handleGenerate}
          disabled={loading}
          title="Generate email for this task"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
          Email
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 gap-1 flex-shrink-0"
          onClick={() => setPreviewOpen(true)}
          title="Review generated email"
        >
          <Eye className="w-3 h-3" />
          Review
        </Button>
      )}

      {/* Preview / Send Modal */}
      {previewOpen && comm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--card-border)" }}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Review Email
                </span>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta */}
            <div
              className="px-5 py-3 border-b text-xs space-y-2"
              style={{ borderColor: "var(--card-border)" }}
            >
              <div>
                <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Subject: </span>
                <span style={{ color: "var(--text-primary)" }}>{comm.subject}</span>
              </div>
              {comm.recipients?.length > 0 && (
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-muted)" }}>To: </span>
                  <span style={{ color: "var(--text-primary)" }}>{comm.recipients.join(", ")}</span>
                </div>
              )}
              {comm.cc_recipients?.filter(Boolean).length > 0 && (
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-muted)" }}>CC: </span>
                  <span style={{ color: "var(--text-primary)" }}>{comm.cc_recipients.filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div
              className="px-5 py-4 max-h-72 overflow-y-auto"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <pre
                className="text-xs whitespace-pre-wrap font-sans leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {comm.generated_content || "(no content)"}
              </pre>
            </div>

            {/* Warning if no recipients */}
            {(!comm.recipients || comm.recipients.length === 0) && (
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                ⚠️ No client email on file. Add a client email to this transaction before sending.
              </div>
            )}

            {/* Actions */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-4 border-t"
              style={{ borderColor: "var(--card-border)" }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={sending || !comm.recipients?.length}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="w-3.5 h-3.5" />
                Send Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Send Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Confirm Send</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              This will send the email to <strong>{comm?.recipients?.join(", ")}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={sending}
                onClick={handleSend}
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Confirm & Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}