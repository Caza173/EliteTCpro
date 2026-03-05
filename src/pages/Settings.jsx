import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Users, Bell, Palette, Loader2, UserPlus, CheckCircle } from "lucide-react";
import { useCurrentUser, isTCOrAdmin } from "../components/auth/useCurrentUser";

export default function Settings() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isTCOrAdmin(currentUser),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole === "tc" || inviteRole === "admin" ? "admin" : "user");
    setInviting(false);
    setInvited(true);
    setInviteEmail("");
    setTimeout(() => setInvited(false), 3000);
  };

  const roleColors = {
    admin: "bg-red-50 text-red-700 border-red-200",
    tc: "bg-purple-50 text-purple-700 border-purple-200",
    agent: "bg-blue-50 text-blue-700 border-blue-200",
    client: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">System configuration and user management.</p>
      </div>

      {/* Current User */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> My Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {currentUser?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{currentUser?.full_name}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
            <Badge variant="outline" className={`ml-auto capitalize ${roleColors[currentUser?.role] || roleColors.agent}`}>
              {currentUser?.role || "agent"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Invite Users — TC/Admin only */}
      {isTCOrAdmin(currentUser) && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tc">TC</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                  invited ? <CheckCircle className="w-4 h-4 mr-2 text-white" /> :
                  <UserPlus className="w-4 h-4 mr-2" />}
                {invited ? "Invited!" : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User list — TC/Admin only */}
      {isTCOrAdmin(currentUser) && allUsers.length > 0 && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Team Members ({allUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
                    {u.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <Select
                    value={u.role || "agent"}
                    onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                    disabled={u.id === currentUser?.id}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tc">TC</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholders */}
      {[
        { icon: Bell, title: "Notifications", desc: "Email deadline reminders via SendGrid/Resend — coming soon." },
        { icon: Palette, title: "Appearance", desc: "Theme customization and branding options coming soon." },
      ].map(({ icon: Icon, title, desc }) => (
        <Card key={title} className="shadow-sm border-gray-100 opacity-70">
          <CardHeader className="flex flex-row items-center gap-4 py-4">
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-700">{title}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}