import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bug, Lightbulb, Puzzle, Search, X, ExternalLink, Loader2,
  ChevronDown, ChevronRight, Layers, ArrowUpDown, Filter,
  AlertOctagon, CheckCircle2, Clock, Zap, TrendingUp, RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META = {
  bug:         { label: "Bug",         icon: Bug,       dot: "bg-red-500",    text: "text-red-500"    },
  feature:     { label: "Feature",     icon: Lightbulb, dot: "bg-amber-500",  text: "text-amber-500"  },
  integration: { label: "Integration", icon: Puzzle,    dot: "bg-purple-500", text: "text-purple-500" },
};

const STATUS_META = {
  new:             { label: "New",             color: "bg-blue-100 text-blue-700"       },
  triaged:         { label: "Triaged",         color: "bg-cyan-100 text-cyan-700"       },
  under_review:    { label: "Under Review",    color: "bg-indigo-100 text-indigo-700"   },
  planned:         { label: "Planned",         color: "bg-amber-100 text-amber-700"     },
  in_progress:     { label: "In Progress",     color: "bg-violet-100 text-violet-700"   },
  waiting_on_info: { label: "Waiting on Info", color: "bg-yellow-100 text-yellow-700"   },
  resolved:        { label: "Resolved",        color: "bg-emerald-100 text-emerald-700" },
  closed:          { label: "Closed",          color: "bg-gray-100 text-gray-500"       },
  declined:        { label: "Declined",        color: "bg-red-100 text-red-700"         },
};

const STATUSES = Object.keys(STATUS_META);

const QUICK_FILTERS = [
  { key: "all",         label: "All" },
  { key: "bug",         label: "Bugs" },
  { key: "feature",     label: "Features" },
  { key: "integration", label: "Integrations" },
  { key: "urgent",      label: "Urgent" },
  { key: "duplicate",   label: "Duplicates" },
  { key: "planned",     label: "Planned" },
  { key: "resolved",    label: "Resolved" },
];

const SEVERITY_META = {
  critical: { color: "text-red-600",   label: "Critical" },
  high:     { color: "text-orange-500",label: "High"     },
  medium:   { color: "text-amber-500", label: "Medium"   },
  low:      { color: "text-gray-400",  label: "Low"      },
};

function priorityBarColor(score) {
  if (!score) return "bg-gray-200";
  if (score >= 90) return "bg-red-500";
  if (score >= 70) return "bg-orange-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-gray-300";
}

function priorityTextColor(score) {
  if (!score) return "var(--text-muted)";
  if (score >= 90) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 40) return "#f59e0b";
  return "var(--text-muted)";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, accent = false, urgent = false }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border flex-1 min-w-0"
      style={{
        background: "var(--card-bg)",
        borderColor: urgent ? "rgba(239,68,68,0.25)" : "var(--card-border)",
      }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${urgent ? "text-red-500" : "text-gray-400"}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide truncate" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className={`text-xl font-bold leading-tight ${urgent ? "text-red-500" : ""}`} style={!urgent ? { color: "var(--text-primary)" } : {}}>
          {value}
        </p>
      </div>
    </div>
  );
}

function PriorityBar({ score }) {
  if (score == null) return <span style={{ color: "var(--text-muted)" }} className="text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-[60px]">
      <div className="w-10 h-1.5 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${priorityBarColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: priorityTextColor(score) }}>{score}</span>
    </div>
  );
}

function FeedbackRow({ item, selected, onSelect }) {
  const meta = TYPE_META[item.type] || TYPE_META.bug;
  const Icon = meta.icon;
  const statusMeta = STATUS_META[item.status] || STATUS_META.new;
  const isHighPriority = item.ai_priority_score >= 90;
  const isMedPriority = item.ai_priority_score >= 70 && item.ai_priority_score < 90;

  return (
    <div
      onClick={() => onSelect(item)}
      className="grid cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: "24px 1fr 28px",
        padding: "7px 14px",
        gap: "0 10px",
        borderBottom: "1px solid var(--card-border)",
        background: selected
          ? "var(--accent-subtle)"
          : isHighPriority
          ? "rgba(239,68,68,0.03)"
          : "transparent",
        borderLeft: selected ? "2px solid var(--accent)" : isHighPriority ? "2px solid rgba(239,68,68,0.4)" : "2px solid transparent",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = isHighPriority ? "rgba(239,68,68,0.03)" : "transparent"; }}
    >
      {/* Icon col */}
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${meta.text}`} />

      {/* Main content */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>{item.title}</span>
          {item.severity && (
            <span className={`text-[10px] font-medium ${SEVERITY_META[item.severity]?.color || ""}`}>
              {item.severity}
            </span>
          )}
          {item.is_urgent && (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1 rounded">URGENT</span>
          )}
        </div>

        {item.ai_summary && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{item.ai_summary}</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <PriorityBar score={item.ai_priority_score} />
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
          {item.module && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: "var(--text-muted)", borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
              {item.module}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {item.created_date ? formatDistanceToNow(parseISO(item.created_date), { addSuffix: true }) : ""}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-3.5 h-3.5 self-center flex-shrink-0" style={{ color: selected ? "var(--accent)" : "var(--text-muted)", opacity: selected ? 1 : 0.4 }} />
    </div>
  );
}

// ─── Cluster View ─────────────────────────────────────────────────────────────

function buildClusters(items) {
  const map = {};
  items.forEach(item => {
    const cluster = item.ai_category || item.type || "other";
    if (!map[cluster]) map[cluster] = [];
    map[cluster].push(item);
  });
  return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
}

function ClusterGroup({ clusterKey, items, onSelect, selectedId }) {
  const [open, setOpen] = useState(items.length <= 3);
  const topItem = items[0];
  return (
    <div className="border-b" style={{ borderColor: "var(--card-border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-opacity-50 transition-colors"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold capitalize flex-1 text-left" style={{ color: "var(--text-primary)" }}>
          {clusterKey.replace(/_/g, " ")}
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-600 font-bold">{items.length}</span>
        </span>
        {topItem?.ai_summary && (
          <span className="text-[11px] truncate max-w-[200px] hidden sm:block" style={{ color: "var(--text-muted)" }}>{topItem.ai_summary}</span>
        )}
        {open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && items.map(item => (
        <FeedbackRow key={item.id} item={item} selected={selectedId === item.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs leading-snug">
      <span className="w-24 flex-shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function DetailPanel({ item, onClose, onUpdate, allItems }) {
  const [status, setStatus] = useState(item.status);
  const [adminNotes, setAdminNotes] = useState(item.admin_notes || "");
  const [publicNote, setPublicNote] = useState(item.public_status_note || "");
  const [assignedTo, setAssignedTo] = useState(item.assigned_to || "");
  const [saving, setSaving] = useState(false);

  // Reset when item changes
  React.useEffect(() => {
    setStatus(item.status);
    setAdminNotes(item.admin_notes || "");
    setPublicNote(item.public_status_note || "");
    setAssignedTo(item.assigned_to || "");
  }, [item.id]);

  const meta = TYPE_META[item.type] || TYPE_META.bug;
  const Icon = meta.icon;
  const statusMeta = STATUS_META[item.status] || STATUS_META.new;

  const similarItems = useMemo(() => {
    if (!item.ai_similar_item_ids?.length) return [];
    return allItems.filter(i => item.ai_similar_item_ids.includes(i.id));
  }, [item.ai_similar_item_ids, allItems]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(item.id, {
      status,
      admin_notes: adminNotes,
      public_status_note: publicNote,
      assigned_to: assignedTo,
      resolved_at: (status === "resolved" || status === "closed") && !item.resolved_at
        ? new Date().toISOString()
        : item.resolved_at,
    });
    setSaving(false);
  };

  const quickStatus = async (s) => {
    setStatus(s);
    setSaving(true);
    await onUpdate(item.id, {
      status: s,
      resolved_at: (s === "resolved" || s === "closed") && !item.resolved_at ? new Date().toISOString() : item.resolved_at,
    });
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0 space-y-1" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.text}`} />
            <p className="text-xs font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{item.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pl-6">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusMeta.color}`}>{statusMeta.label}</span>
          {item.severity && (
            <span className={`text-[10px] font-medium ${SEVERITY_META[item.severity]?.color || ""}`}>{item.severity}</span>
          )}
          {item.ai_priority_score != null && (
            <span className="text-[10px] font-semibold" style={{ color: priorityTextColor(item.ai_priority_score) }}>
              P{item.ai_priority_score}
            </span>
          )}
          {item.is_urgent && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">URGENT</span>}
          {item.is_transaction_risk && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1 rounded">TX RISK</span>}
          {item.is_roadmap_candidate && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">ROADMAP</span>}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick action bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b flex-wrap" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
          {["planned", "in_progress", "resolved", "declined"].map(s => (
            <button
              key={s}
              onClick={() => quickStatus(s)}
              disabled={saving}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                status === s
                  ? "border-blue-400 text-blue-700 bg-blue-50"
                  : "border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
              style={{ borderColor: status === s ? undefined : "var(--card-border)" }}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: "var(--text-muted)" }} />}
        </div>

        <div className="px-4 py-3 space-y-4 text-sm">

          {/* AI Analysis */}
          {item.ai_summary && (
            <Section title="AI Analysis">
              <div className="rounded-md p-3 space-y-2 text-xs" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
                <p className="leading-relaxed" style={{ color: "var(--text-primary)" }}>{item.ai_summary}</p>
                {item.ai_urgency_reason && (
                  <p className="italic" style={{ color: "var(--text-secondary)" }}>{item.ai_urgency_reason}</p>
                )}
                <div className="flex gap-4 pt-1 flex-wrap">
                  {item.ai_priority_score != null && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Priority </span>
                      <span className="font-bold" style={{ color: priorityTextColor(item.ai_priority_score) }}>{item.ai_priority_score}/100</span>
                    </div>
                  )}
                  {item.ai_impact_score != null && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Impact </span>
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{item.ai_impact_score}/100</span>
                    </div>
                  )}
                </div>
                {item.ai_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {item.ai_tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] border" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)", background: "var(--card-bg)" }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Original Submission */}
          <Section title="Submission">
            <div className="space-y-0.5">
              <DetailRow label="Type" value={meta.label} />
              <DetailRow label="Module" value={item.module} />
              {item.severity && <DetailRow label="Severity" value={item.severity} />}
              {item.reproducibility && <DetailRow label="Reproducible" value={item.reproducibility} />}
              {item.target_role && <DetailRow label="Target Role" value={item.target_role} />}
              {item.request_frequency && <DetailRow label="Frequency" value={item.request_frequency} />}
              {item.requested_platform && <DetailRow label="Platform" value={item.requested_platform} />}
              {item.integration_category && <DetailRow label="Int. Category" value={item.integration_category} />}
            </div>
          </Section>

          {item.description && (
            <Section title="Description">
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{item.description}</p>
            </Section>
          )}

          {item.expected_behavior && (
            <Section title="Expected Behavior">
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{item.expected_behavior}</p>
            </Section>
          )}

          {(item.value_tags?.length > 0 || item.requested_sync_items?.length > 0) && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1">
                {item.value_tags?.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}>{t}</span>
                ))}
                {item.requested_sync_items?.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Context */}
          <Section title="Context">
            <div className="space-y-0.5">
              <DetailRow label="Submitted by" value={item.user_name ? `${item.user_name} (${item.user_email})` : item.user_email} />
              {item.created_date && (
                <DetailRow label="Submitted" value={format(parseISO(item.created_date), "MMM d, yyyy h:mm a")} />
              )}
              {item.route_name && <DetailRow label="Page" value={item.route_name} />}
              {item.browser_info && <DetailRow label="Browser" value={item.browser_info} />}
            </div>
            {item.transaction_id && (
              <Link
                to={`${createPageUrl("TransactionDetail")}?id=${item.transaction_id}`}
                className="flex items-center gap-1 text-xs mt-1 hover:underline"
                style={{ color: "var(--accent)" }}
              >
                <ExternalLink className="w-3 h-3" />
                {item.transaction_address || "View Transaction"}
              </Link>
            )}
          </Section>

          {/* Similar items */}
          {similarItems.length > 0 && (
            <Section title={`Duplicates / Similar (${similarItems.length})`}>
              <div className="space-y-1">
                {similarItems.map(si => {
                  const sm = TYPE_META[si.type] || TYPE_META.bug;
                  const SIcon = sm.icon;
                  return (
                    <div key={si.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded border cursor-pointer hover:bg-opacity-80 transition-colors"
                      style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
                      <SIcon className={`w-3 h-3 flex-shrink-0 ${sm.text}`} />
                      <span className="truncate flex-1">{si.title}</span>
                      <span className={`text-[10px] px-1 rounded ${STATUS_META[si.status]?.color || ""}`}>{si.status?.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Admin Actions */}
          <Section title="Admin Actions">
            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Status</label>
                <select
                  className="w-full rounded-md border px-2.5 py-1.5 text-xs"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Assign to</label>
                <input
                  className="w-full rounded-md border px-2.5 py-1.5 text-xs"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                  placeholder="email or name"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Public note</label>
                <textarea
                  className="w-full rounded-md border px-2.5 py-1.5 text-xs resize-none"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                  rows={2}
                  value={publicNote}
                  onChange={e => setPublicNote(e.target.value)}
                  placeholder="Shown to submitter…"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Internal notes</label>
                <textarea
                  className="w-full rounded-md border px-2.5 py-1.5 text-xs resize-none"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Admin-only. Not shown to submitter."
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FeedbackCenter() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [groupByCluster, setGroupByCluster] = useState(false);

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

  // KPIs
  const newCount = useMemo(() => items.filter(i => i.status === "new").length, [items]);
  const urgentCount = useMemo(() => items.filter(i => (i.ai_priority_score ?? 0) >= 90 || i.is_urgent).length, [items]);
  const bugCount = useMemo(() => items.filter(i => i.type === "bug").length, [items]);
  const featureCount = useMemo(() => items.filter(i => i.type === "feature").length, [items]);
  const integrationCount = useMemo(() => items.filter(i => i.type === "integration").length, [items]);
  const thirtyDaysAgo = subDays(new Date(), 30);
  const resolvedCount = useMemo(() => items.filter(i =>
    (i.status === "resolved" || i.status === "closed") &&
    i.resolved_at && parseISO(i.resolved_at) > thirtyDaysAgo
  ).length, [items]);

  const filtered = useMemo(() => {
    let list = [...items];

    // Quick filter
    if (quickFilter === "bug" || quickFilter === "feature" || quickFilter === "integration") {
      list = list.filter(i => i.type === quickFilter);
    } else if (quickFilter === "urgent") {
      list = list.filter(i => (i.ai_priority_score ?? 0) >= 90 || i.is_urgent);
    } else if (quickFilter === "duplicate") {
      list = list.filter(i => i.ai_similar_item_ids?.length > 0);
    } else if (quickFilter === "planned") {
      list = list.filter(i => i.status === "planned" || i.status === "in_progress");
    } else if (quickFilter === "resolved") {
      list = list.filter(i => i.status === "resolved" || i.status === "closed");
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter(i => i.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.ai_summary?.toLowerCase().includes(q) ||
        i.user_email?.toLowerCase().includes(q) ||
        i.module?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === "priority") {
      list.sort((a, b) => (b.ai_priority_score ?? 0) - (a.ai_priority_score ?? 0));
    } else if (sortBy === "severity") {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      list.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
    }
    // default: date (already sorted by API)

    return list;
  }, [items, quickFilter, statusFilter, search, sortBy]);

  if (!isOwnerOrAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Admin access required.</p>
      </div>
    );
  }

  const clusters = useMemo(() => groupByCluster ? buildClusters(filtered) : [], [filtered, groupByCluster]);

  return (
    <div className="flex flex-col gap-4 h-full" style={{ height: "calc(100vh - 57px)", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4 flex-shrink-0 pt-1">
        <div>
          <h1 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Feedback Center</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>System issues, feature requests, and integrations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              className="rounded-md border pl-8 pr-3 py-1.5 text-xs w-48 outline-none transition-colors"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              placeholder="Search feedback…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
          </select>
          <select
            className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date">Sort: Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="severity">Sort: Severity</option>
          </select>
          <button
            onClick={() => setGroupByCluster(g => !g)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${groupByCluster ? "bg-blue-50 border-blue-300 text-blue-700" : ""}`}
            style={!groupByCluster ? { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-secondary)" } : {}}
          >
            <Layers className="w-3.5 h-3.5" />
            Clusters
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="flex gap-2 flex-shrink-0 overflow-x-auto pb-0.5">
        <KpiCard label="New" value={newCount} icon={Clock} />
        <KpiCard label="Urgent" value={urgentCount} icon={Zap} urgent={urgentCount > 0} />
        <KpiCard label="Bugs" value={bugCount} icon={Bug} />
        <KpiCard label="Features" value={featureCount} icon={Lightbulb} />
        <KpiCard label="Integrations" value={integrationCount} icon={Puzzle} />
        <KpiCard label="Resolved (30d)" value={resolvedCount} icon={CheckCircle2} />
      </div>

      {/* ── Quick filters ── */}
      <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setQuickFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              quickFilter === f.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-transparent hover:border-gray-300"
            }`}
            style={quickFilter !== f.key ? { color: "var(--text-secondary)", background: "transparent" } : {}}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{filtered.length} items</span>
      </div>

      {/* ── Main split ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left: list */}
        <div
          className={`flex flex-col rounded-xl border overflow-hidden flex-shrink-0 ${selectedItem ? "hidden lg:flex" : "flex-1 w-full"}`}
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
            width: selectedItem ? "calc(70% - 6px)" : "100%",
          }}
        >
          {/* Column headers */}
          <div
            className="grid text-[10px] uppercase tracking-wider font-semibold px-4 py-2 border-b flex-shrink-0"
            style={{
              gridTemplateColumns: "24px 1fr 28px",
              gap: "0 10px",
              borderColor: "var(--card-border)",
              background: "var(--bg-tertiary)",
              color: "var(--text-muted)",
            }}
          >
            <span />
            <span>Title · Summary · Priority · Status</span>
            <span />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs py-8" style={{ color: "var(--text-muted)" }}>No items match your filters.</p>
            ) : groupByCluster ? (
              clusters.map(([key, clusterItems]) => (
                <ClusterGroup
                  key={key}
                  clusterKey={key}
                  items={clusterItems}
                  onSelect={setSelectedItem}
                  selectedId={selectedItem?.id}
                />
              ))
            ) : (
              filtered.map(item => (
                <FeedbackRow
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelect={setSelectedItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        {selectedItem && (
          <div
            className="flex flex-col rounded-xl border overflow-hidden flex-1 lg:flex-none"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              width: "30%",
              minWidth: "280px",
            }}
          >
            <DetailPanel
              key={selectedItem.id}
              item={selectedItem}
              allItems={items}
              onClose={() => setSelectedItem(null)}
              onUpdate={handleUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}