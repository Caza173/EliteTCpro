import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Upload, Clock, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

const DOC_LABELS = {
  purchase_and_sale: "Purchase & Sale Agreement",
  listing_agreement: "Listing Agreement",
  addendum: "Addendum",
  buyer_agency_agreement: "Buyer Agency Agreement",
  other: "Other",
};

const STATUS_STYLES = {
  missing: { badge: "bg-red-50 text-red-600 border-red-200", label: "Missing" },
  uploaded: { badge: "bg-amber-50 text-amber-600 border-amber-200", label: "Uploaded" },
  approved: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Approved" },
  rejected: { badge: "bg-red-50 text-red-600 border-red-200", label: "Rejected" },
};

export default function DocChecklistPanel({ items = [], currentUser, transactionId, brokerageId, onUpload }) {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentChecklistItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist", transactionId] }),
  });

  const canApprove = ["tc", "admin", "owner"].includes(currentUser?.role);
  const isClient = currentUser?.role === "client";

  const visibleItems = isClient ? items.filter((i) => i.visible_to_client) : items;

  if (visibleItems.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No checklist items.</p>;
  }

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => {
        const { badge, label } = STATUS_STYLES[item.status] || STATUS_STYLES.missing;
        const StatusIcon = item.status === "approved" ? CheckCircle2 : item.status === "uploaded" ? Clock : XCircle;
        return (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${item.status === "approved" ? "text-emerald-500" : item.status === "missing" || item.status === "rejected" ? "text-red-400" : "text-amber-400"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{item.label || DOC_LABELS[item.doc_type] || item.doc_type}</p>
                {item.required && <span className="text-red-400 text-xs">*required</span>}
                {item.visible_to_client && <span className="text-blue-400 text-xs">client-visible</span>}
              </div>
              {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
              {item.reviewed_at && (
                <p className="text-xs text-gray-400">Reviewed {format(new Date(item.reviewed_at), "MMM d")}</p>
              )}
            </div>
            <Badge variant="outline" className={`text-xs ${badge}`}>{label}</Badge>

            {/* TC approve/reject for uploaded items */}
            {canApprove && item.status === "uploaded" && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs px-2"
                  disabled={approvingId === item.id}
                  onClick={async () => {
                    setApprovingId(item.id);
                    await updateMutation.mutateAsync({
                      id: item.id,
                      data: {
                        status: "approved",
                        reviewed_by_user_id: currentUser?.id,
                        reviewed_at: new Date().toISOString(),
                      },
                    });
                    setApprovingId(null);
                  }}
                >
                  {approvingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs px-2"
                  onClick={() =>
                    updateMutation.mutate({
                      id: item.id,
                      data: {
                        status: "rejected",
                        reviewed_by_user_id: currentUser?.id,
                        reviewed_at: new Date().toISOString(),
                        notes: prompt("Rejection reason (optional):") || "",
                      },
                    })
                  }
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}