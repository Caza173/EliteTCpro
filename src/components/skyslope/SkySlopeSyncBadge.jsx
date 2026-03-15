import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Minus } from "lucide-react";

const STATUS_CONFIG = {
  synced:     { label: "SkySlope Synced", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending:    { label: "Sync Pending",    icon: Clock,         className: "bg-amber-50 text-amber-700 border-amber-200" },
  error:      { label: "Sync Failed",     icon: AlertCircle,   className: "bg-red-50 text-red-700 border-red-200" },
  not_synced: { label: "Not Synced",      icon: Minus,         className: "bg-gray-50 text-gray-500 border-gray-200" },
};

export default function SkySlopeSyncBadge({ transaction, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const status = transaction?.skyslope_sync_status || "not_synced";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_synced;
  const Icon = config.icon;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await base44.functions.invoke("skySlopeSync", {
        action: "syncTransaction",
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
      });
      if (onSynced) onSynced();
    } catch (err) {
      setError("Sync failed. Check your SkySlope credentials.");
    }
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`text-xs flex items-center gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
      {transaction?.skyslope_transaction_id && (
        <span className="text-xs text-gray-400">ID: {transaction.skyslope_transaction_id}</span>
      )}
      {(status === "not_synced" || status === "error") && (
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-6 text-xs px-2">
          <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync to SkySlope"}
        </Button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {transaction?.skyslope_sync_error && status === "error" && (
        <span className="text-xs text-red-400 max-w-xs truncate" title={transaction.skyslope_sync_error}>
          {transaction.skyslope_sync_error}
        </span>
      )}
    </div>
  );
}