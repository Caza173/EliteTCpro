import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Copy, RefreshCw, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { writeAuditLog } from "@/components/utils/tenantUtils";

export default function PortalAccessCell({ user, currentUser }) {
  const queryClient = useQueryClient();
  const [viewModal, setViewModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = ["admin", "owner", "tc_lead", "tc"].includes(currentUser?.role);
  const portalAccess = user.portal_access || { enabled: false, code: null };

  const handleView = () => {
    setViewModal(true);
    writeAuditLog({
      brokerageId: currentUser?.brokerage_id,
      actorEmail: currentUser?.email,
      action: "portal_code_viewed",
      entityType: "user",
      entityId: user.id,
      description: `Viewed portal code for ${user.full_name}`
    }).catch(() => {});
  };

  const handleCopy = async () => {
    if (portalAccess.code) {
      await navigator.clipboard.writeText(portalAccess.code);
      writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        actorEmail: currentUser?.email,
        action: "portal_code_copied",
        entityType: "user",
        entityId: user.id,
        description: `Copied portal code for ${user.full_name}`
      }).catch(() => {});
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const newCode = `${user.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await base44.entities.User.update(user.id, {
        portal_access: { enabled: true, code: newCode }
      });
      writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        actorEmail: currentUser?.email,
        action: "portal_code_reset",
        entityType: "user",
        entityId: user.id,
        description: `Reset portal code for ${user.full_name}`
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      setResetModal(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">
          {portalAccess.enabled ? (
            <span className="text-emerald-600">Enabled</span>
          ) : (
            <span className="text-gray-400">Disabled</span>
          )}
        </span>
        {portalAccess.enabled && portalAccess.code && (
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
              Share this code with <strong>{user.full_name}</strong> to access the portal.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm font-semibold text-center">
              {portalAccess.code}
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
            Are you sure you want to reset the portal code for <strong>{user.full_name}</strong>? The old code will no longer work.
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
    </>
  );
}