import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Copy, RefreshCw, Loader2, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { writeAuditLog } from "@/components/utils/tenantUtils";
import PortalAccessSendModal from "./PortalAccessSendModal";

export default function PortalAccessCell({ user, currentUser, transaction, onRefresh }) {
  const queryClient = useQueryClient();
  const [viewModal, setViewModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = ["admin", "owner", "tc_lead", "tc"].includes(currentUser?.role) || currentUser?.email === "nhcazateam@gmail.com";

  // Fetch portal access for this transaction
  const { data: portalAccess } = useQuery({
    queryKey: ["portalAccess", transaction?.id],
    queryFn: async () => {
      if (!transaction?.id) return null;
      const res = await base44.entities.PortalAccess.filter({ transaction_id: transaction.id });
      return res?.[0] || null;
    },
    enabled: !!transaction?.id,
  });

  const handleView = () => {
    setViewModal(true);
    writeAuditLog({
      brokerageId: currentUser?.brokerage_id,
      transactionId: transaction?.id,
      actorEmail: currentUser?.email,
      action: "portal_code_viewed",
      entityType: "portal_access",
      entityId: portalAccess?.id,
      description: `Viewed portal code for transaction ${transaction?.address}`,
    }).catch(() => {});
  };

  const handleCopy = async () => {
    if (portalAccess?.code) {
      await navigator.clipboard.writeText(portalAccess.code);
      writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        transactionId: transaction?.id,
        actorEmail: currentUser?.email,
        action: "portal_code_copied",
        entityType: "portal_access",
        entityId: portalAccess.id,
        description: `Copied portal code for transaction ${transaction?.address}`,
      }).catch(() => {});
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const newCode = `${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      
      if (portalAccess?.id) {
        // Update existing
        await base44.entities.PortalAccess.update(portalAccess.id, {
          code: newCode,
          enabled: true,
          last_reset_at: new Date().toISOString(),
        });
      } else {
        // Create new
        await base44.entities.PortalAccess.create({
          code: newCode,
          transaction_id: transaction.id,
          brokerage_id: transaction.brokerage_id,
          enabled: true,
          last_reset_at: new Date().toISOString(),
          created_by: currentUser?.email,
        });
      }

      writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        transactionId: transaction?.id,
        actorEmail: currentUser?.email,
        action: "portal_code_reset",
        entityType: "portal_access",
        entityId: portalAccess?.id,
        description: `Reset portal code for transaction ${transaction?.address}`,
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ["portalAccess", transaction?.id] });
      setResetModal(false);
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin || !transaction?.id) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  const enabled = portalAccess?.enabled && portalAccess?.code;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">
          {enabled ? (
            <span className="text-emerald-600">Enabled</span>
          ) : (
            <span className="text-gray-400">Disabled</span>
          )}
        </span>
        {enabled && (
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-blue-600"
              onClick={handleView}
              title="View code"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-blue-600"
              onClick={handleCopy}
              title="Copy code"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-orange-600"
              onClick={() => setResetModal(true)}
              title="Reset code"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-green-600"
              onClick={() => setSendModal(true)}
              title="Send via email"
            >
              <Mail className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Dialog open={viewModal} onOpenChange={setViewModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Portal Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Share this code to access the portal for <strong>{transaction?.address}</strong>.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm font-semibold text-center tracking-widest">
              {portalAccess?.code}
            </div>
            <p className="text-xs text-gray-400 text-center">
              This modal will close automatically in 10 seconds.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={resetModal} onOpenChange={setResetModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Portal Code</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Reset the portal code for <strong>{transaction?.address}</strong>? The old code will no longer work.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      {portalAccess && (
        <PortalAccessSendModal
          open={sendModal}
          portalAccess={portalAccess}
          transaction={transaction}
          currentUser={currentUser}
          onClose={() => setSendModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["portalAccess", transaction.id] });
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}