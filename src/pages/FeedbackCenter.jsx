import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bug, Lightbulb, Puzzle, AlertTriangle, CheckCircle, Clock, Search,
  ChevronDown, ChevronUp, X, Layers, ExternalLink, Loader2,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

const TYPE_META = {
  bug:         { label: "Bug", icon: Bug, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  feature:     { label: "Feature", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  integration: { label: "Integration", icon: Puzzle, color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
};

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  triaged: "bg-cyan-100 text-cyan-700",
  under_review: "bg-indigo-100 text-indigo-700",
  planned: "bg-amber-100 text-amber-700",
  in_progress: "bg-purple-100 text-purple-700",
  waiting_on_info: "bg-yellow-100 text-yellow-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-700",
};

const STATUSES = ["new","triaged","under_review","planned","in_progress","waiting_on_info","resolved","closed","declined"];

const PRIORITY_COLOR = (score) => {
  if (!score) return "text-gray-400";
  if (score >= 90) return "text-red-600 font-bold";
  if (score >= 70) return "text-orange-500 font-semibold";
  if (score >= 40) return "text-amber-500";
  return "text-gray-400";
};

function StatCard({ label, value, color = "text-gray-900", sub }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-1" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function FeedbackRow({ item, onSelect, selected }) {
  const meta = TYPE_META[item.type] || TYPE_META.bug;
  const Icon = meta.icon;
  return (
    <div
      onClick={() => onSelect(item)}
      className={`px-4 py-3 border-b cursor-pointer transition-colors hover:opacity-90 ${selected ? "ring-1 ring-inset ring-blue-300" : ""}`}
      style={{ borderColor: "var(--card-border)", background: selected ? "var(--accent-subtle)" : "var(--card-bg)" }}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{item.title}</span>
            {item.is_urgent && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">Urgent</Badge>}
            {item.is_transaction_risk && <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">TX Risk</Badge>}
            {item.is_roadmap_candidate && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Roadmap</Badge>}
          </div>
          {item.ai_summary && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>{item.ai_summary}</p>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{item.user_email}</span>
            {item.module && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{item.module}</span>}
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {item.created_date ? formatDistanceToNow(parseISO(item.created_date), { addSuffix: true }) : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.ai_priority_score != null && (
            <span className={`text-xs ${PRIORITY_COLOR(item.ai_priority_score)}`}>{item.ai_priority_score}</span>
          )}
          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
            {item.status?.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ item, onClose, onUpdate }) {
  const [status, setStatus] = useState(item.status);
  const [adminNotes, setAdminNotes] = useState(item.admin_notes || "");
  const [publicNote, setPublicNote] = useState(item.public_status_note || "");
  const [saving, setSaving] = useState(false);
  const meta = TYPE_META[item.type] || TYPE_META.bug;
  const Icon = meta.icon;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(item.id, {
      status,
      admin_notes: adminNotes,
      public_status_note: publicNote,
      resolved_at: (status === "resolved" || status === "closed") && !item.resolved_at ? new Date().toISOString() : item.resolved_at,
    });
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm" style={{ color: "var(--text-primary)" }}>
        {/* Flags */}
        <div className="flex flex-wrap gap-2">
          {item.is_urgent && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
          {item.is_transaction_risk && <Badge className="bg-orange-100 text-orange-700">TX Risk</Badge>}
          {item.is_roadmap_candidate && <Badge className="bg-emerald-100 text-emerald-700">Roadmap Candidate</Badge>}
          {item.is_integration_candidate && <Badge className="bg-purple-100 text-purple-700">Integration Candidate</Badge>}
        </div>

        {/* AI Triage */}
        {item.ai_summary && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>AI Triage</p>
            <p className="text-xs leading-relaxed">{item.ai_summary}</p>
            <div className="flex flex-wrap gap-3 text-xs pt-1">
              {item.ai_priority_score != null && <span><span style={{ color: "var(--text-muted)" }}>Priority:</span> <span className={PRIORITY_COLOR(item.ai_priority_score)}>{item.ai_priority_score}/100</span></span>}
              {item.ai_impact_score != null && <span><span style={{ color: "var(--text-muted)" }}>Impact:</span> <strong>{item.ai_impact_score}/100</strong></span>}
              {item.ai_urgency_reason && <span><span style={{ color: "var(--text-muted)" }}>Reason:</span> {item.ai_urgency_reason}</span>}
            </div>
            {item.ai_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.ai_tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-muted)" }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submission details */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Submission</p>
          <Row label="Type" value={item.type} />
          <Row label="Module" value={item.module} />
          {item.severity && <Row label="Severity" value={item.severity} />}
          {item.reproducibility && <Row label="Reproducible" value={item.reproducibility} />}
          {item.target_role && <Row label="Target Role" value={item.target_role} />}
          {item.request_frequency && <Row label="Frequency" value={item.request_frequency} />}
          {item.requested_platform && <Row label="Platform" value={item.requested_platform} />}
          {item.integration_category && <Row label="Category" value={item.integration_category} />}
          <Row label="Submitted by" value={`${item.user_name || ""} (${item.user_email || ""})`} />
          {item.created_date && <Row label="Submitted" value={format(parseISO(item.created_date), "MMM d, yyyy h:mm a")} />}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </div>

        {item.expected_behavior && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Expected Behavior</p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{item.expected_behavior}</p>
          </div>
        )}

        {item.value_tags?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Value Tags</p>
            <div className="flex flex-wrap gap-1">{item.value_tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
          </div>
        )}

        {item.requested_sync_items?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sync Items</p>
            <div className="flex flex-wrap gap-1">{item.requested_sync_items.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
          </div>
        )}

        {item.transaction_id && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Linked Transaction</p>
            <Link
              to={`${createPageUrl("TransactionDetail")}?id=${item.transaction_id}`}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              {item.transaction_address || item.transaction_id} <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {item.ai_similar_item_ids?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Similar Items</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.ai_similar_item_ids.length} linked report(s)</p>
          </div>
        )}

        {/* Admin actions */}
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Admin Actions</p>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              value={status} onChange={e => setStatus(e.target.value)}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Public note (shown to submitter)</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              rows={2} value={publicNote} onChange={e => setPublicNote(e.target.value)}
              placeholder="e.g. We're working on this — expected in next release."
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Internal admin notes</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
              placeholder="Internal notes — not shown to submitter."
            />
          </div>
          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-28 flex-shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function FeedbackCenter() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedbackItems"],
    queryFn: () => base44.entities.FeedbackItem.list("-created_date", 200),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeedbackItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedbackItems"] }),
  });

  const handleUpdate = async (id, data) => {
    await updateMutation.mutateAsync({ id, data });
    setSelectedItem(prev => prev?.id === id ? { ...prev, ...data } : prev);
  };

  const filtered = useMemo(() => items.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title?.toLowerCase().includes(q) ||
        item.ai_summary?.toLowerCase().includes(q) ||
        item.user_email?.toLowerCase().includes(q) ||
        item.module?.toLowerCase().includes(q);
    }
    return true;
  }), [items, typeFilter, statusFilter, search]);

  if (!isOwnerOrAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">Admin access required.</p>
      </div>
    );
  }

  const bugs = items.filter(i => i.type === "bug");
  const urgent = items.filter(i => i.is_urgent);
  const features = items.filter(i => i.type === "feature");
  const integrations = items.filter(i => i.type === "integration");
  const newCount = items.filter(i => i.status === "new").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Feedback Center</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>AI-triaged bugs, feature requests, and integration requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="New" value={newCount} color="text-blue-600" />
        <StatCard label="Urgent" value={urgent.length} color="text-red-600" />
        <StatCard label="Bugs" value={bugs.length} />
        <StatCard label="Features" value={features.length} />
        <StatCard label="Integrations" value={integrations.length} />
        <StatCard label="Resolved" value={items.filter(i => i.status === "resolved" || i.status === "closed").length} color="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search feedback…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">Bugs</SelectItem>
            <SelectItem value="feature">Features</SelectItem>
            <SelectItem value="integration">Integrations</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Main split view */}
      <div className="flex gap-4 min-h-[500px]" style={{ height: "calc(100vh - 340px)" }}>
        {/* List */}
        <div className={`rounded-xl border overflow-hidden flex flex-col ${selectedItem ? "hidden lg:flex lg:flex-1" : "flex-1"}`}
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="px-4 py-2.5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{filtered.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No items match your filters.</p>
            ) : (
              filtered.map(item => (
                <FeedbackRow key={item.id} item={item} onSelect={setSelectedItem} selected={selectedItem?.id === item.id} />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="w-full lg:w-96 flex-shrink-0 rounded-xl border overflow-hidden flex flex-col"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <DetailPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onUpdate={handleUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}