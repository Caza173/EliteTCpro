import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Public page — no login required.
 * Reads ?token=XYZ&action=approve|reject from URL and calls handleApprovalAction.
 */
export default function ApprovalAction() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const action = params.get("action");

  const [state, setState] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isReject = action === "reject";

  useEffect(() => {
    if (!token || !action) {
      setState("error");
      setMessage("Invalid link — missing token or action.");
      return;
    }
    if (action === "approve") {
      submitAction("approve");
    } else if (action === "reject") {
      setShowRejectForm(true);
    }
  }, []);

  const submitAction = async (act, rejectionReason) => {
    setState("loading");
    setShowRejectForm(false);
    const res = await base44.functions.invoke("handleApprovalAction", {
      token,
      action: act,
      reason: rejectionReason || undefined,
    });
    const data = res.data;
    if (data?.success === false) {
      setState("error");
      setMessage(data.message || "This request has already been actioned.");
    } else if (data?.error) {
      setState("error");
      setMessage(data.error);
    } else {
      setState("success");
      setMessage(data?.message || `Successfully ${act === "approve" ? "approved" : "rejected"}.`);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Processing your response…</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    const approved = action === "approve";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          {approved
            ? <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />}
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {approved ? "Approved!" : "Rejected"}
          </h1>
          <p className="text-gray-500">{message}</p>
          <p className="text-sm text-gray-400 mt-4">You can close this window.</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Process</h1>
          <p className="text-gray-500">{message}</p>
          <p className="text-sm text-gray-400 mt-4">Please contact your transaction coordinator.</p>
        </div>
      </div>
    );
  }

  // Reject form
  if (showRejectForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">Reject Approval</h1>
          <p className="text-gray-500 text-sm text-center mb-6">Optionally provide a reason for rejection.</p>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
            rows={4}
            placeholder="Reason for rejection (optional)…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => submitAction("reject", reason)}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}