import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Users, Bell, Palette, Loader2, UserPlus, CheckCircle, Building2, DollarSign, FileText, Pencil, X, Bug, Lightbulb, Puzzle, MessageSquarePlus, Activity, Mail, UserCircle, Trash2, Shield, Search, HelpCircle, BookOpen, Globe, Plus, Upload } from "lucide-react";
import { tutorialSections } from "@/lib/helpContent";
import TutorialSidebar from "@/components/help/TutorialSidebar";
import TutorialSectionCard from "@/components/help/TutorialSectionCard";
import FAQTab from "@/components/help/FAQTab";
import { useCurrentUser, isTCOrAdmin, isOwnerOrAdmin } from "../components/auth/useCurrentUser";
import { ROLE_COLORS } from "../components/utils/tenantUtils";
import TemplateLibraryPanel from "../components/templates/TemplateLibraryPanel";
import FeedbackModal from "../components/feedback/FeedbackModal";
import MyFeedbackSection from "../components/feedback/MyFeedbackSection";
import ProfileTab from "../components/settings/ProfileTab";
import TeamManagementPanel from "../components/teams/TeamManagementPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

  // Email Signature
  const [signatureForm, setSignatureForm] = useState({
    sig_name: "Corey Caza",
    sig_role: "EliteTC Operations",
    sig_company: "Realty One Group Next Level",
    sig_phone: "(603) 520-5431",
  });
  const [signatureSaved, setSignatureSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFinanceForm({
        broker_split_percent: currentUser.broker_split_percent ?? 20,
        broker_cap: currentUser.broker_cap ?? 0,
        franchise_fee_percent: currentUser.franchise_fee_percent ?? 0,
        transaction_fee: currentUser.transaction_fee ?? 0,
        eo_fee: currentUser.eo_fee ?? 0,
      });
      setSignatureForm({
        sig_name: currentUser.sig_name || "Corey Caza",
        sig_role: currentUser.sig_role || "EliteTC Operations",
        sig_company: currentUser.sig_company || "Realty One Group Next Level",
        sig_phone: currentUser.sig_phone || "(603) 520-5431",
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

  const saveSignatureMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSignatureSaved(true);
      setTimeout(() => setSignatureSaved(false), 2500);
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

  const [feedbackModal, setFeedbackModal] = useState({ open: false, type: "bug" });
  const [editingBrokerage, setEditingBrokerage] = useState(false);
  const [brokerageForm, setBrokerageForm] = useState({});
  const [brokerageSaved, setBrokerageSaved] = useState(false);

  useEffect(() => {
    if (brokerage) {
      setBrokerageForm({
        name: brokerage.name || "",
        timezone: brokerage.timezone || "",
        primary_contact_email: brokerage.primary_contact_email || "",
      });
    }
  }, [brokerage]);

  const saveBrokerageMutation = useMutation({
    mutationFn: (data) => base44.entities.Brokerage.update(brokerage.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokerage", currentUser?.brokerage_id] });
      setBrokerageSaved(true);
      setEditingBrokerage(false);
      setTimeout(() => setBrokerageSaved(false), 2500);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke("deleteUser", { user_id: id }),
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
  const [activeTab, setActiveTab] = useState("account");
  const [helpTab, setHelpTab] = useState("tutorial");
  const helpSectionRefs = React.useRef({});
  const [helpActiveSectionId, setHelpActiveSectionId] = useState(tutorialSections[0].id);
  const scrollToHelpSection = (id) => {
    setHelpActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  const isTC = currentUser?.role === "tc" || currentUser?.role === "tc_lead";

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["auditLogs", currentUser?.brokerage_id],
    queryFn: () => base44.entities.AuditLog.filter({ brokerage_id: currentUser?.brokerage_id }, "-created_date", 100),
    enabled: !!currentUser?.brokerage_id && isOwnerOrAdmin(currentUser) && activeTab === "auditlog",
  });

  const { data: auditTransactions = [] } = useQuery({
    queryKey: ["transactions-audit"],
    queryFn: () => base44.entities.Transaction.list(),
    enabled: isOwnerOrAdmin(currentUser) && activeTab === "auditlog",
  });

  const txAddressMap = Object.fromEntries(auditTransactions.map(t => [t.id, t.address]));

  const filteredLogs = auditLogs.filter((l) => {
    const matchesSearch = !auditSearch ||
      l.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.actor_email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.description?.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesAction = auditActionFilter === "all" || l.action === auditActionFilter;
    const matchesEntity = auditEntityFilter === "all" || l.entity_type === auditEntityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueAuditActions = [...new Set(auditLogs.map(l => l.action).filter(Boolean))].sort();
  const uniqueAuditEntities = [...new Set(auditLogs.map(l => l.entity_type).filter(Boolean))].sort();

  const ACTION_COLORS = {
    phase_changed: "bg-blue-50 text-blue-700",
    task_completed: "bg-emerald-50 text-emerald-700",
    doc_uploaded: "bg-purple-50 text-purple-700",
    doc_approved: "bg-emerald-50 text-emerald-700",
    doc_rejected: "bg-red-50 text-red-700",
    user_invited: "bg-cyan-50 text-cyan-700",
    role_changed: "bg-amber-50 text-amber-700",
    billing_event: "bg-orange-50 text-orange-700",
    deadline_edited: "bg-amber-50 text-amber-700",
  };

  const TABS = [
    { id: "account",    label: "Account",    icon: SettingsIcon },
    { id: "profile",    label: "Profile",    icon: UserCircle },
    { id: "team",       label: "Team",       icon: Users,             adminOnly: true },
    { id: "finance",    label: "Finance",    icon: DollarSign,        tcHidden: true },
    { id: "templates",  label: "Templates",  icon: FileText,          adminOnly: true },
    { id: "auditlog",   label: "Audit Log",  icon: Shield,            ownerOnly: true },
    { id: "help",       label: "Help",       icon: HelpCircle },
    { id: "feedback",   label: "Feedback",   icon: MessageSquarePlus },
    { id: "system",     label: "System",     icon: Activity,          tcHidden: true },
  ].filter(t => {
    if (t.adminOnly && !isTCOrAdmin(currentUser)) return false;
    if (t.ownerOnly && !isOwnerOrAdmin(currentUser)) return false;
    if (t.tcHidden && isTC) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>System configuration and user management.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-none" style={{ background: "var(--bg-tertiary)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={activeTab === id
              ? { background: "var(--card-bg)", color: "var(--text-primary)", boxShadow: "var(--card-shadow)" }
              : { color: "var(--text-muted)" }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Account ── */}
      {activeTab === "account" && (
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
      )}

      {/* ── Profile ── */}
      {activeTab === "profile" && <ProfileTab currentUser={currentUser} />}

      {/* ── Team ── */}
      {activeTab === "team" && isTCOrAdmin(currentUser) && (
        <div className="space-y-4">
          {/* Invite User */}
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Invite User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <Input type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="flex-1" />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tc">TC</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700">
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : invited ? <CheckCircle className="w-4 h-4 mr-2 text-white" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {invited ? "Invited!" : "Invite"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User Roles */}
          {allUsers.length > 0 && (
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" /> Users & Roles ({allUsers.length})
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
                      <Select value={u.role || "agent"} onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })} disabled={u.id === currentUser?.id}>
                        <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tc">TC</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {currentUser?.email === "nhcazateam@gmail.com" && u.id !== currentUser?.id && (
                        <button
                          onClick={() => { if (window.confirm(`Delete ${u.full_name || u.email}?`)) deleteUserMutation.mutate(u.id); }}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Management */}
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Team Management
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Organize TCs into teams. Each team controls which deals members can see.</p>
            </CardHeader>
            <CardContent>
              <TeamManagementPanel currentUser={currentUser} allUsers={allUsers} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Brokerage ── */}
      {activeTab === "brokerage" && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Brokerage
              </CardTitle>
              {!editingBrokerage ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-gray-500" onClick={() => setEditingBrokerage(true)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-gray-400" onClick={() => setEditingBrokerage(false)}>
                  <X className="w-3 h-3" /> Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!brokerage ? (
              <p className="text-sm text-gray-400">No brokerage linked to your account.</p>
            ) : !editingBrokerage ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Name</p><p className="font-medium">{brokerage.name}</p></div>
                <div><p className="text-xs text-gray-400">Status</p>
                  <Badge variant="outline" className={`capitalize text-xs ${brokerage.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : brokerage.status === "trial" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-600"}`}>
                    {brokerage.status}
                  </Badge>
                </div>
                <div><p className="text-xs text-gray-400">Timezone</p><p className="font-medium">{brokerage.timezone || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Contact</p><p className="font-medium">{brokerage.primary_contact_email || "—"}</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label className="text-xs text-gray-500 mb-1 block">Name</Label><Input value={brokerageForm.name} onChange={(e) => setBrokerageForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" /></div>
                <div><Label className="text-xs text-gray-500 mb-1 block">Timezone</Label><Input value={brokerageForm.timezone} onChange={(e) => setBrokerageForm(f => ({ ...f, timezone: e.target.value }))} placeholder="e.g. America/New_York" className="h-8 text-sm" /></div>
                <div><Label className="text-xs text-gray-500 mb-1 block">Contact Email</Label><Input type="email" value={brokerageForm.primary_contact_email} onChange={(e) => setBrokerageForm(f => ({ ...f, primary_contact_email: e.target.value }))} className="h-8 text-sm" /></div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => saveBrokerageMutation.mutate(brokerageForm)} disabled={saveBrokerageMutation.isPending}>
                  {saveBrokerageMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : brokerageSaved ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                  {brokerageSaved ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Finance ── */}
      {activeTab === "finance" && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Finance Defaults
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">These values auto-populate the Finance tab on each transaction.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Broker Split %", field: "broker_split_percent" },
                { label: "Franchise Fee %", field: "franchise_fee_percent" },
                { label: "Transaction Fee ($)", field: "transaction_fee" },
                { label: "E&O Fee ($)", field: "eo_fee" },
                { label: "Broker Cap ($)", field: "broker_cap" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                  <Input type="number" step="0.1" value={financeForm[field]} onChange={(e) => setFinanceForm((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveFinanceMutation.mutate(financeForm)} disabled={saveFinanceMutation.isPending}>
                {financeSaved ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <DollarSign className="w-4 h-4 mr-1.5" />}
                {financeSaved ? "Saved!" : "Save Finance Defaults"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Email Signature ── */}
      {activeTab === "email" && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" /> Email Signature
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Appears at the bottom of every outgoing email sent from EliteTC.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Name", field: "sig_name" },
                { label: "Role / Title", field: "sig_role" },
                { label: "Company", field: "sig_company" },
                { label: "Phone", field: "sig_phone" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                  <Input value={signatureForm[field]} onChange={(e) => setSignatureForm((prev) => ({ ...prev, [field]: e.target.value }))} className="h-8 text-sm" />
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg border bg-gray-50 text-sm text-gray-700 leading-relaxed">
              <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Preview</p>
              <p className="font-semibold">{signatureForm.sig_name || "—"}</p>
              <p>{signatureForm.sig_role || ""}</p>
              <p>{signatureForm.sig_company || ""}</p>
              <p>{signatureForm.sig_phone || ""}</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveSignatureMutation.mutate(signatureForm)} disabled={saveSignatureMutation.isPending}>
              {signatureSaved ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <Mail className="w-4 h-4 mr-1.5" />}
              {signatureSaved ? "Saved!" : "Save Signature"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Templates ── */}
      {activeTab === "templates" && isTCOrAdmin(currentUser) && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" /> PDF Templates
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Upload NHAR forms and other PDF templates. Map fields once, reuse across all transactions.</p>
          </CardHeader>
          <CardContent>
            <TemplateLibraryPanel />
          </CardContent>
        </Card>
      )}

      {/* ── Feedback ── */}
      {activeTab === "feedback" && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-blue-500" /> Feedback & Requests
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Help us improve EliteTC — report a bug, suggest a feature, or request an integration.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "bug", icon: Bug, label: "Report a Bug", desc: "Something broken or not working right", color: "text-red-500", bg: "hover:border-red-300 hover:bg-red-50/50" },
                { type: "feature", icon: Lightbulb, label: "Suggest a Feature", desc: "An idea to improve the platform", color: "text-amber-500", bg: "hover:border-amber-300 hover:bg-amber-50/50" },
                { type: "integration", icon: Puzzle, label: "Request Integration", desc: "Connect EliteTC to a tool you use", color: "text-purple-500", bg: "hover:border-purple-300 hover:bg-purple-50/50" },
              ].map(({ type, icon: Icon, label, desc, color, bg }) => (
                <button key={type} onClick={() => setFeedbackModal({ open: true, type })} className={`text-left p-4 rounded-xl border transition-all ${bg}`} style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}>
                  <Icon className={`w-5 h-5 mb-2 ${color}`} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </button>
              ))}
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>My Submitted Feedback</p>
              <MyFeedbackSection userEmail={currentUser?.email} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── System ── */}
      {activeTab === "system" && (
        <div className="space-y-4">
          <Link to="/settings/system-diagnostics">
            <Card className="shadow-sm border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4 py-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">System Diagnostics</p>
                  <p className="text-xs text-gray-400">Check PWA status, connectivity, and caching info.</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Card className="shadow-sm border-gray-100 opacity-70">
            <CardHeader className="flex flex-row items-center gap-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center"><Bell className="w-4 h-4 text-gray-400" /></div>
              <div><p className="font-semibold text-sm text-gray-700">Notification Rules</p><p className="text-xs text-gray-400">Configure deadline alerts, task reminders, and doc checklist notifications.</p></div>
            </CardHeader>
          </Card>
          <Card className="shadow-sm border-gray-100 opacity-70">
            <CardHeader className="flex flex-row items-center gap-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center"><Palette className="w-4 h-4 text-gray-400" /></div>
              <div><p className="font-semibold text-sm text-gray-700">Branding</p><p className="text-xs text-gray-400">Upload logo, set primary color, and customize the client portal.</p></div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ── Help & Training ── */}
      {activeTab === "help" && (
        <div className="space-y-5">
          {/* Sub-tab bar */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {[{ id: "tutorial", label: "Tutorial", icon: BookOpen }, { id: "faq", label: "FAQ", icon: HelpCircle }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setHelpTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${helpTab === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {helpTab === "tutorial" && (
            <div className="flex gap-6 items-start">
              <div className="hidden lg:block">
                <TutorialSidebar sections={tutorialSections} activeId={helpActiveSectionId} onSelect={scrollToHelpSection} />
              </div>
              <div className="lg:hidden w-full">
                <select className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
                  style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  value={helpActiveSectionId} onChange={e => scrollToHelpSection(e.target.value)}>
                  {tutorialSections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-0 space-y-5">
                {tutorialSections.map(section => <TutorialSectionCard key={section.id} section={section} />)}
                <div className="rounded-xl border p-6 text-center space-y-3" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Still Need Help?</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>The AI Assistant has full context on your transactions and can answer questions in real time.</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setHelpTab("faq")}>
                    <HelpCircle className="w-4 h-4" /> Browse FAQ
                  </Button>
                </div>
              </div>
            </div>
          )}

          {helpTab === "faq" && (
            <div>
              <FAQTab />
              <div className="rounded-xl border p-6 text-center space-y-3 mt-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Can't find your answer?</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Try the Tutorial tab for step-by-step walkthroughs.</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setHelpTab("tutorial")}>
                  <BookOpen className="w-4 h-4" /> View Tutorial
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ── */}
      {activeTab === "auditlog" && isOwnerOrAdmin(currentUser) && (
        <div className="space-y-4">
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${ACTION_COLORS[selectedLog.action] || "bg-gray-50 text-gray-600"}`}>
                      {selectedLog.action?.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-800">{selectedLog.description || `${selectedLog.entity_type} ${selectedLog.entity_id}`}</span>
                  </div>
                  <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Actor: <span className="font-medium text-gray-700">{selectedLog.actor_email || "system"}</span></span>
                  {selectedLog.transaction_id && <span>Transaction: <span className="font-medium text-gray-700">{txAddressMap[selectedLog.transaction_id] || selectedLog.transaction_id}</span></span>}
                  {selectedLog.entity_type && <span>Entity: <span className="font-medium text-gray-700">{selectedLog.entity_type}</span></span>}
                  <span>Time: <span className="font-medium text-gray-700">{selectedLog.created_date ? (() => { try { return format(new Date(selectedLog.created_date), "MMM d, yyyy h:mm:ss a"); } catch { return selectedLog.created_date; } })() : "—"}</span></span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {!selectedLog.before && !selectedLog.after ? (
                    <p className="text-sm text-gray-400 text-center py-8">No before/after data recorded for this event.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedLog.before && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Before</p>
                          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.before, null, 2)}</pre>
                        </div>
                      )}
                      {selectedLog.after && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">After</p>
                          <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.after, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9 w-52 h-8 text-sm" placeholder="Search logs…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
            </div>
            <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueAuditActions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueAuditEntities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            {(auditActionFilter !== "all" || auditEntityFilter !== "all" || auditSearch) && (
              <button onClick={() => { setAuditActionFilter("all"); setAuditEntityFilter("all"); setAuditSearch(""); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          <Card className="shadow-sm border-gray-100">
            <CardContent className="pt-4">
              {auditLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No audit events recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((log) => (
                    <div key={log.id} onClick={() => setSelectedLog(log)} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
                            {log.action?.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-sm text-gray-700">{log.description || `${log.entity_type} ${log.entity_id}`}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          by <span className="font-medium text-gray-500">{log.actor_email || "system"}</span>
                          {log.transaction_id && <> · <span className="text-gray-500">{txAddressMap[log.transaction_id] || log.transaction_id?.slice(-6)}</span></>}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {log.created_date ? (() => { try { return format(new Date(log.created_date), "MMM d, h:mm a"); } catch { return ""; } })() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <FeedbackModal open={feedbackModal.open} onClose={() => setFeedbackModal({ open: false, type: "bug" })} defaultType={feedbackModal.type} />
    </div>
  );
}