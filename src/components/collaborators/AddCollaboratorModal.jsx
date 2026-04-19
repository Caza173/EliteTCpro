import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Search, Crown, Users, Eye, Loader2 } from "lucide-react";

const ROLES = [
  { value: "primary_tc", label: "Primary TC", icon: Crown, desc: "Full coordination authority. One per transaction." },
  { value: "secondary_tc", label: "Secondary TC", icon: Users, desc: "Can edit tasks, upload docs, send emails." },
  { value: "viewer_tc", label: "Viewer", icon: Eye, desc: "Read-only access to all transaction data." },
];

export default function AddCollaboratorModal({ open, onClose, onAdd, existingEmails = [], brokerageId }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("secondary_tc");
  const [adding, setAdding] = useState(false);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["tc-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const tcUsers = allUsers.filter(u =>
    (u.role === "tc" || u.role === "tc_lead" || u.role === "owner" || u.role === "admin") &&
    !existingEmails.includes(u.email)
  );

  const filtered = tcUsers.filter(u => {
    const q = search.toLowerCase();
    return !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    await onAdd({
      user_id: selectedUser.id,
      user_email: selectedUser.email,
      user_name: selectedUser.full_name || selectedUser.email,
      role: selectedRole,
    });
    setAdding(false);
    setSelectedUser(null);
    setSearch("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add Collaborator</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)" }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              autoFocus
              placeholder="Search TC users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* User List */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                {tcUsers.length === 0 ? "No TC users found in the system." : "No matching users."}
              </p>
            )}
            {filtered.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: selectedUser?.id === user.id ? "var(--accent-subtle)" : "var(--bg-tertiary)",
                  border: `1px solid ${selectedUser?.id === user.id ? "var(--accent)" : "transparent"}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}
                >
                  {(user.full_name || user.email || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                </div>
                {selectedUser?.id === user.id && (
                  <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>Selected</span>
                )}
              </button>
            ))}
          </div>

          {/* Role Selection */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Role</p>
            <div className="space-y-2">
              {ROLES.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setSelectedRole(value)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                  style={{
                    backgroundColor: selectedRole === value ? "var(--accent-subtle)" : "var(--bg-tertiary)",
                    borderColor: selectedRole === value ? "var(--accent)" : "var(--card-border)",
                  }}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: selectedRole === value ? "var(--accent)" : "var(--text-muted)" }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--card-border)" }}>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            disabled={!selectedUser || adding}
            onClick={handleAdd}
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {adding ? "Adding…" : "Add Collaborator"}
          </Button>
        </div>
      </div>
    </div>
  );
}