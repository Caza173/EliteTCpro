import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bug, Lightbulb, Puzzle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, parseISO } from "date-fns";

const TYPE_ICONS = { bug: Bug, feature: Lightbulb, integration: Puzzle };
const TYPE_COLORS = { bug: "text-red-500", feature: "text-amber-500", integration: "text-purple-500" };

const PUBLIC_STATUS_MAP = {
  new: { label: "Received", color: "bg-blue-100 text-blue-700" },
  triaged: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
  planned: { label: "Planned", color: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700" },
  waiting_on_info: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Resolved", color: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", color: "bg-gray-100 text-gray-600" },
};

export default function MyFeedbackSection({ userEmail }) {
  const [showAll, setShowAll] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["myFeedback", userEmail],
    queryFn: () => base44.entities.FeedbackItem.filter({ user_email: userEmail }, "-created_date", 50),
    enabled: !!userEmail,
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>Loading…</p>;
  if (items.length === 0) return (
    <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>You haven't submitted any feedback yet.</p>
  );

  const visible = showAll ? items : items.slice(0, 4);

  return (
    <div className="space-y-2">
      {visible.map(item => {
        const Icon = TYPE_ICONS[item.type] || Bug;
        const statusInfo = PUBLIC_STATUS_MAP[item.status] || PUBLIC_STATUS_MAP.new;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 px-3 py-3 rounded-lg border"
            style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}
          >
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TYPE_COLORS[item.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {item.type} · {item.created_date ? formatDistanceToNow(parseISO(item.created_date), { addSuffix: true }) : ""}
              </p>
              {item.public_status_note && (
                <p className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)" }}>{item.public_status_note}</p>
              )}
            </div>
            <Badge className={`text-[10px] px-2 py-0.5 flex-shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
          </div>
        );
      })}

      {items.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show {items.length - 4} more</>}
        </button>
      )}
    </div>
  );
}