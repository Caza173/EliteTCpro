import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Search, UserPlus, Loader2, CheckCircle, Pencil, Trash2, Eye, ShieldAlert, Mail
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser, hasFullAccess, canDeleteRecords } from "../components/auth/useCurrentUser";
import { ROLE_COLORS, writeAuditLog } from "../components/utils/tenantUtils";

const ROLES = ["admin", "owner", "tc_lead", "tc", "agent", "client"];
const ROLE_LABELS = {
  admin: "Admin", owner: "Owner", tc_lead: "TC Lead", tc: "TC",
  agent: "Agent", client: "Client",
};

function ConfirmDeleteDialog({ open, onConfirm, onCancel, userName }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" /> Delete User
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailDialog({ user, transactions, onClose, onRoleChange, currentUser }) {
  const userTxns = useMemo(() =>
    transactions.filter(t => t.agent_email === user.email || t.agent === user.full_name),
    [transactions, user]
  );

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            {user?.full_name || user?.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400 mb-1">Email</p><p className="font-medium text-gray-800 truncate">{user?.email}</p></div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Role</p>
              <Select
                value={user?.role || "agent"}
                onValueChange={(role) => onRoleChange(user.id, role)}
                disabled={user?.id === currentUser?.id}
              >
                <SelectTrigger className="h-7 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><p className="text-xs text-gray-400 mb-1">Member Since</p><p className="font-medium">{user?.created_date ? new Date(user.created_date).toLocaleDateString() : "—"}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Brokerage ID</p><p className="font-medium truncate">{user?.brokerage_id || "—"}</p></div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Associated Transactions ({userTxns.length})</p>
            {userTxns.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No transactions found.</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {userTxns.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                    <span className="font-medium text-gray-800 truncate">{t.address}</span>
                    <Badge variant="outline" className="capitalize text-[10px] ml-2">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.users.inviteUser(email, ["tc", "tc_lead", "admin", "owner"].includes(role) ? "admin" : "user");
    setLoading(false);
    onSuccess();
    onClose();
    setEmail("");
    setRole("agent");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite User
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listUsers", {});
      return res.data?.users || [];
    },
    enabled: hasFullAccess(currentUser),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["allTransactions"],
    queryFn: () => base44.entities.Transaction.list(),
    enabled: hasFullAccess(currentUser),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.functions.invoke("updateUserRole", { user_id: id, role }),
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      if (selectedUser?.id === vars.id) {
        setSelectedUser(prev => ({ ...prev, role: vars.role }));
      }
      await writeAuditLog({ brokerageId: currentUser?.brokerage_id, actorEmail: currentUser?.email, action: "role_changed", entityType: "user", entityId: vars.id, after: { role: vars.role }, description: `Role changed to ${vars.role}` });
    },
  });

  const toggleWeeklyUpdatesMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.User.update(id, { weekly_transaction_updates: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allUsers"] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.User.delete(id),
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      setDeleteTarget(null);
      await writeAuditLog({ brokerageId: currentUser?.brokerage_id, actorEmail: currentUser?.email, action: "user_deleted", entityType: "user", entityId: vars.id, description: "User deleted" });
    },
  });

  const filtered = useMemo(() => {
    let list = allUsers;
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, roleFilter, search]);

  const txnCountForUser = (user) =>
    transactions.filter(t => t.agent_email === user.email || t.agent === user.full_name).length;

  if (!hasFullAccess(currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p className="text-gray-600 font-medium">Access Denied</p>
        <p className="text-sm text-gray-400">You don't have permission to view user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage all platform users.</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs text-gray-500 mb-1 block">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-gray-400 self-end pb-1.5">
              {filtered.length} of {allUsers.length} users
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="shadow-sm border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5 text-left font-medium">User</th>
                    <th className="px-4 py-2.5 text-left font-medium">Role</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Transactions</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Joined</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Weekly Updates</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                            {u.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.full_name || "—"}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          {u.email === "nhcazateam@gmail.com" && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] hidden sm:flex">Super Admin</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role || "agent"}
                          onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                          disabled={u.id === currentUser?.id && u.email !== "nhcazateam@gmail.com"}
                        >
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-600 font-medium">{txnCountForUser(u)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {(u.role === "agent" || u.role === "tc" || u.role === "tc_lead") ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.weekly_transaction_updates !== false}
                              onCheckedChange={(v) => toggleWeeklyUpdatesMutation.mutate({ id: u.id, value: v })}
                            />
                            <span className="text-xs text-gray-400">{u.weekly_transaction_updates !== false ? "On" : "Off"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-blue-600"
                            onClick={() => setSelectedUser(u)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canDeleteRecords(currentUser) && u.id !== currentUser?.id && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-600"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["allUsers"] })}
      />
      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          transactions={transactions}
          onClose={() => setSelectedUser(null)}
          onRoleChange={(id, role) => updateRoleMutation.mutate({ id, role })}
          currentUser={currentUser}
        />
      )}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        userName={deleteTarget?.full_name || deleteTarget?.email}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteUserMutation.mutate({ id: deleteTarget.id })}
      />
    </div>
  );
}