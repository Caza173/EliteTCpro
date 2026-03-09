import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Users, Bell, Palette, Loader2, UserPlus, CheckCircle, Building2, DollarSign } from "lucide-react";
import { useCurrentUser, isTCOrAdmin, isOwnerOrAdmin } from "../components/auth/useCurrentUser";
import { ROLE_COLORS } from "../components/utils/tenantUtils";

export default function Settings() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [financeForm, setFinanceForm] = useState({
    broker_split_percent: "",
    broker_cap: "",
    franchise_fee_percent: "",
    transaction_fee: "",
    eo_fee: "",
  });
  const [financeDefaults, setFinanceDefaults] = useState({});
  const [financeSaved, setFinanceSaved] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setFinanceForm({
        broker_split_percent: currentUser.broker_split_percent ?? 20,
        broker_cap: currentUser.broker_cap ?? 0,
        franchise_fee_percent: currentUser.franchise_fee_percent ?? 0,
        transaction_fee: currentUser.transaction_fee ?? 0,
        eo_fee: currentUser.eo_fee ?? 0,
      });
    }
  }, [currentUser]);

  const saveFinanceMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setFinanceSaved(true);
      setTimeout(() => setFinanceSaved(false), 2500);
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isTCOrAdmin(currentUser),
  });

  const { data: brokerage } = useQuery({
    queryKey: ["brokerage", currentUser?.brokerage_id],
    queryFn: () => base44.entities.Brokerage.filter({ id: currentUser?.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
    select: (data) => data[0],
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

  const roleColors = ROLE_COLORS;

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

      {/* Brokerage info */}
      {brokerage && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Brokerage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Name</p><p className="font-medium">{brokerage.name}</p></div>
              <div><p className="text-xs text-gray-400">Status</p>
                <Badge variant="outline" className={`capitalize text-xs ${brokerage.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : brokerage.status === "trial" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-600"}`}>
                  {brokerage.status}
                </Badge>
              </div>
              <div><p className="text-xs text-gray-400">Timezone</p><p className="font-medium">{brokerage.timezone}</p></div>
              <div><p className="text-xs text-gray-400">Contact</p><p className="font-medium">{brokerage.primary_contact_email || "—"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholders */}
      <Card className="shadow-sm border-gray-100 opacity-70">
        <CardHeader className="flex flex-row items-center gap-4 py-4">
          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-700">Notification Rules</p>
            <p className="text-xs text-gray-400">Configure deadline alerts, task reminders, and doc checklist notifications.</p>
          </div>
        </CardHeader>
      </Card>
      <Card className="shadow-sm border-gray-100 opacity-70">
        <CardHeader className="flex flex-row items-center gap-4 py-4">
          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
            <Palette className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-700">Branding</p>
            <p className="text-xs text-gray-400">Upload logo, set primary color, and customize the client portal.</p>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}