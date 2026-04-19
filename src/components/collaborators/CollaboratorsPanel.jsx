import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserPlus, Crown, Eye, Users, MoreHorizontal, Trash2, ArrowRight, Loader2, Shield,
} from "lucide-react";
import AddCollaboratorModal from "./AddCollaboratorModal";
import { format } from "date-fns";

const ROLE_CONFIG = {
  primary_tc: {
    label: "Primary TC",
    icon: Crown,
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    iconCls: "text-amber-500",
  },
  secondary_tc: {
    label: "Secondary TC",
    icon: Users,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    iconCls: "text-blue-500",
  },
  viewer_tc: {
    label: "Viewer",
    icon: Eye,
    cls: "bg-gray-100 text-gray-600 border-gray-200",
    iconCls: "text-gray-400",
  },
};

function Initials({ name, email }) {
  const str = name || email || "?";
  const parts = str.split(" ");
  const init = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : str.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}
    >
      {init}
    </div>
  );
}

export default function CollaboratorsPanel({ transaction, currentUser, onRefresh }) {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null); // collaborator id
  const [busy, setBusy] = useState(null);

  const myCollabRole = collaborators?.find(c => c.user_email === currentUser?.email)?.role;

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators", transaction.id],
    queryFn: () => base44.entities.TransactionCollaborator.filter(
      { transaction_id: transaction.id, status: "active" }
    ),
    enabled: !!transaction.id,
    staleTime: 15_000,
  });

  const myRole = collaborators.find(c => c.user_email === currentUser?.email)?.role;
  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.email === "nhcazateam@gmail.com";
  const canManage = myRole === "primary_tc" || isOwnerOrAdmin;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["collaborators", transaction.id] });

  const handleAddCollaborator = async ({ user_email, user_name, user_id, role }) => {
    // Enforce single primary_tc
    if (role === "primary_tc") {
      const existingPrimary = collaborators.find(c => c.role === "primary_tc");
      if (existingPrimary) {
        await base44.entities.TransactionCollaborator.update(existingPrimary.id, { role: "secondary_tc" });
      }
    }
    // Check if already a collaborator
    const existing = collaborators.find(c => c.user_email === user_email);
    if (existing) {
      await base44.entities.TransactionCollaborator.update(existing.id, { role, status: "active" });
    } else {
      await base44.entities.TransactionCollaborator.create({
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id || null,
        user_id: user_id || null,
        user_email,
        user_name: user_name || user_email,
        role,
        status: "active",
        added_by: currentUser?.email,
      });
    }
    // Log
    await logActivity("collaborator_added", `${user_name || user_email} added as ${role}`);
    invalidate();
    onRefresh?.();
  };

  const handleRemove = async (collab) => {
    if (collab.role === "primary_tc") {
      alert("Cannot remove the Primary TC. Transfer primary role first.");
      return;
    }
    setBusy(collab.id);
    await base44.entities.TransactionCollaborator.update(collab.id, { status: "removed" });
    await logActivity("collaborator_removed", `${collab.user_name || collab.user_email} removed from transaction`);
    setBusy(null);
    setMenuOpen(null);
    invalidate();
  };

  const handleRoleChange = async (collab, newRole) => {
    setBusy(collab.id);
    if (newRole === "primary_tc") {
      // Demote current primary
      const existingPrimary = collaborators.find(c => c.role === "primary_tc" && c.id !== collab.id);
      if (existingPrimary) {
        await base44.entities.TransactionCollaborator.update(existingPrimary.id, { role: "secondary_tc" });
      }
      await logActivity("primary_tc_transferred", `Primary TC transferred to ${collab.user_name || collab.user_email}`);
    }
    await base44.entities.TransactionCollaborator.update(collab.id, { role: newRole });
    await logActivity("role_changed", `${collab.user_name || collab.user_email} role changed to ${newRole}`);
    setBusy(null);
    setMenuOpen(null);
    invalidate();
  };

  const logActivity = async (action, description) => {
    await base44.entities.AuditLog.create({
      brokerage_id: transaction.brokerage_id || null,
      transaction_id: transaction.id,
      actor_email: currentUser?.email || "system",
      action,
      entity_type: "transaction",
      entity_id: transaction.id,
      description,
    }).catch(() => {});
  };

  const primary = collaborators.find(c => c.role === "primary_tc");
  const secondaries = collaborators.filter(c => c.role === "secondary_tc");
  const viewers = collaborators.filter(c => c.role === "viewer_tc");

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Team</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {collaborators.length} collaborator{collaborators.length !== 1 ? "s" : ""} on this transaction
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            onClick={() => setAddModalOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Collaborator
          </Button>
        )}
      </div>

      {/* Permissions Notice for Secondary/Viewer */}
      {myRole === "secondary_tc" && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border"
          style={{ backgroundColor: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}
        >
          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            You are a <strong>Secondary TC</strong> on this file. You can edit tasks, upload documents, add notes, and send emails, but final compliance actions require the Primary TC.
          </p>
        </div>
      )}
      {myRole === "viewer_tc" && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border"
          style={{ backgroundColor: "rgba(148,163,184,0.06)", borderColor: "rgba(148,163,184,0.2)" }}
        >
          <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            You have <strong>Viewer</strong> access. You can view all transaction details but cannot make edits.
          </p>
        </div>
      )}

      {/* Empty state */}
      {collaborators.length === 0 && (
        <div
          className="text-center py-10 rounded-xl border"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--bg-tertiary)" }}
        >
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No collaborators yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Add TC team members to collaborate on this transaction.</p>
        </div>
      )}

      {/* Collaborator Groups */}
      {[
        { title: "Primary TC", items: primary ? [primary] : [], emptyNote: "No primary TC assigned" },
        { title: "Supporting TCs", items: secondaries },
        { title: "Viewers", items: viewers },
      ].map(({ title, items, emptyNote }) => (
        items.length > 0 || emptyNote ? (
          <div key={title} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{title}</p>
            {items.length === 0 && emptyNote ? (
              <p className="text-xs px-2" style={{ color: "var(--text-muted)" }}>{emptyNote}</p>
            ) : items.map(collab => (
              <CollaboratorRow
                key={collab.id}
                collab={collab}
                canManage={canManage}
                busy={busy === collab.id}
                menuOpen={menuOpen === collab.id}
                onMenuToggle={() => setMenuOpen(menuOpen === collab.id ? null : collab.id)}
                onMenuClose={() => setMenuOpen(null)}
                onRemove={() => handleRemove(collab)}
                onRoleChange={(role) => handleRoleChange(collab, role)}
              />
            ))}
          </div>
        ) : null
      ))}

      <AddCollaboratorModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddCollaborator}
        existingEmails={collaborators.map(c => c.user_email)}
        brokerageId={transaction.brokerage_id}
      />
    </div>
  );
}

function CollaboratorRow({ collab, canManage, busy, menuOpen, onMenuToggle, onMenuClose, onRemove, onRoleChange }) {
  const cfg = ROLE_CONFIG[collab.role] || ROLE_CONFIG.viewer_tc;
  const RoleIcon = cfg.icon;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <Initials name={collab.user_name} email={collab.user_email} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {collab.user_name || collab.user_email}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{collab.user_email}</p>
      </div>
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 ${cfg.cls}`}>
        <RoleIcon className={`w-3 h-3 ${cfg.iconCls}`} />
        {cfg.label}
      </div>
      {collab.last_activity_at && (
        <p className="text-[10px] hidden sm:block flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {format(new Date(collab.last_activity_at), "MMM d")}
        </p>
      )}
      {canManage && (
        <div className="relative flex-shrink-0">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
          ) : (
            <button
              onClick={onMenuToggle}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-tertiary)" }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={onMenuClose} />
              <div
                className="absolute right-0 top-8 z-50 rounded-xl border shadow-lg py-1 min-w-[180px]"
                style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5" style={{ color: "var(--text-muted)" }}>Change Role</p>
                {Object.entries(ROLE_CONFIG).map(([roleKey, rcfg]) => (
                  <button
                    key={roleKey}
                    disabled={collab.role === roleKey}
                    onClick={() => onRoleChange(roleKey)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-default"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <rcfg.icon className={`w-3.5 h-3.5 ${rcfg.iconCls}`} />
                    {collab.role === roleKey ? `✓ ${rcfg.label}` : rcfg.label}
                  </button>
                ))}
                <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                {collab.role !== "primary_tc" && (
                  <button
                    onClick={onRemove}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                {collab.role === "primary_tc" && (
                  <p className="text-[10px] px-3 py-1.5" style={{ color: "var(--text-muted)" }}>Transfer role to remove</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}