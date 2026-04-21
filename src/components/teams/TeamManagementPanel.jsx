/**
 * TeamManagementPanel — Full team CRUD UI for Settings > Team tab.
 * Super admins can create/manage teams and assign members.
 * TCs/viewers can see their team memberships.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Trash2, Loader2, CheckCircle, ChevronDown, ChevronUp,
  UserPlus, Shield, Eye, UserCog, X
} from "lucide-react";
import { toast } from "sonner";

const ROLE_STYLES = {
  team_admin: "bg-purple-50 text-purple-700 border-purple-200",
  tc:         "bg-blue-50 text-blue-700 border-blue-200",
  viewer:     "bg-gray-50 text-gray-600 border-gray-200",
};

const ROLE_ICONS = {
  team_admin: Shield,
  tc:         UserCog,
  viewer:     Eye,
};

function TeamCard({ team, members, allUsers, currentUser, isAdmin, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("tc");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  const availableUsers = allUsers.filter(u => !members.find(m => m.user_id === u.id));

  const handleAddMember = async () => {
    if (!newMemberId) return;
    const targetUser = allUsers.find(u => u.id === newMemberId);
    if (!targetUser) return;
    setSaving(true);
    try {
      await base44.functions.invoke("manageTeam", {
        action: "add_member",
        team_id: team.id,
        user_id: targetUser.id,
        user_email: targetUser.email,
        user_name: targetUser.full_name || targetUser.email,
        role: newMemberRole,
      });
      toast.success(`${targetUser.full_name || targetUser.email} added to team`);
      setAddingMember(false);
      setNewMemberId("");
      onRefresh();
    } catch (e) {
      toast.error(e.message || "Failed to add member");
    }
    setSaving(false);
  };

  const handleRemoveMember = async (member) => {
    setRemoving(member.id);
    try {
      await base44.functions.invoke("manageTeam", {
        action: "remove_member",
        team_id: team.id,
        member_id: member.id,
      });
      toast.success("Member removed");
      onRefresh();
    } catch (e) {
      toast.error(e.message || "Failed to remove member");
    }
    setRemoving(null);
  };

  const handleRoleChange = async (member, newRole) => {
    try {
      await base44.functions.invoke("manageTeam", {
        action: "update_member_role",
        team_id: team.id,
        member_id: member.id,
        role: newRole,
      });
      toast.success("Role updated");
      onRefresh();
    } catch (e) {
      toast.error(e.message || "Failed to update role");
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{team.name}</p>
            {team.description && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{team.description}</p>
            )}
          </div>
          <Badge variant="outline" className="text-xs ml-2">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "var(--card-border)" }}>
          {/* Members list */}
          <div className="space-y-1.5">
            {members.length === 0 && (
              <p className="text-xs text-gray-400 italic">No members yet</p>
            )}
            {members.map(member => {
              const RoleIcon = ROLE_ICONS[member.role] || UserCog;
              return (
                <div key={member.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                    {(member.user_name || member.user_email)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {member.user_name || member.user_email}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{member.user_email}</p>
                  </div>
                  {isAdmin ? (
                    <Select value={member.role} onValueChange={r => handleRoleChange(member, r)}>
                      <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team_admin">Team Admin</SelectItem>
                        <SelectItem value="tc">TC</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_STYLES[member.role] || ""}`}>
                      {member.role?.replace("_", " ")}
                    </Badge>
                  )}
                  {isAdmin && member.user_id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={!!removing}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove member"
                    >
                      {removing === member.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <X className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member */}
          {isAdmin && (
            <>
              {addingMember ? (
                <div className="flex gap-2 items-center flex-wrap pt-1">
                  <select
                    value={newMemberId}
                    onChange={e => setNewMemberId(e.target.value)}
                    className="h-8 text-xs rounded-md border flex-1 px-2 focus:outline-none"
                    style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                  >
                    <option value="">Select user…</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                    ))}
                  </select>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_admin">Team Admin</SelectItem>
                      <SelectItem value="tc">TC</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddMember} disabled={!newMemberId || saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingMember(false); setNewMemberId(""); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-dashed" onClick={() => setAddingMember(true)}>
                  <UserPlus className="w-3 h-3" /> Add Member
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamManagementPanel({ currentUser, allUsers }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.email === "nhcazateam@gmail.com" ||
    ["admin", "owner"].includes(currentUser?.role);

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => base44.functions.invoke("manageTeam", { action: "list_my_teams" }).then(r => r.data),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  const { data: allMembersData, isLoading: loadingMembers } = useQuery({
    queryKey: ["all-team-members"],
    queryFn: async () => {
      const teams = teamsData?.teams || [];
      if (!teams.length) return {};
      const results = await Promise.all(
        teams.map(t =>
          base44.functions.invoke("manageTeam", { action: "get_team_members", team_id: t.id })
            .then(r => ({ team_id: t.id, members: r.data?.members || [] }))
        )
      );
      return Object.fromEntries(results.map(r => [r.team_id, r.members]));
    },
    enabled: !!(teamsData?.teams?.length),
    staleTime: 30_000,
  });

  const teams = teamsData?.teams || [];
  const allMembers = allMembersData || {};

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-teams"] });
    queryClient.invalidateQueries({ queryKey: ["all-team-members"] });
  };

  const handleCreateTeam = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await base44.functions.invoke("manageTeam", {
        action: "create_team",
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      toast.success(`Team "${form.name}" created`);
      setCreating(false);
      setForm({ name: "", description: "" });
      handleRefresh();
    } catch (e) {
      toast.error(e.message || "Failed to create team");
    }
    setSaving(false);
  };

  if (loadingTeams) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading teams…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Teams ({teams.length})
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Teams control which deals each TC can see and claim.
          </p>
        </div>
        {isAdmin && !creating && (
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> Create Team
          </Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl border border-dashed p-4 space-y-3"
          style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold text-blue-500">New Team</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Team Name *</label>
              <Input
                placeholder="e.g. Northeast Team"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
              <Input
                placeholder="Optional description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreateTeam} disabled={!form.name.trim() || saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              {saving ? "Creating…" : "Create Team"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCreating(false); setForm({ name: "", description: "" }); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed"
          style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No teams yet</p>
          {isAdmin && (
            <p className="text-xs text-gray-400 mt-1">Create a team to organize your TCs and control deal visibility.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              members={allMembers[team.id] || []}
              allUsers={allUsers}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}