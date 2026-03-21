import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Receipt, ChevronDown, ChevronUp } from "lucide-react";

const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent_to_agent: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  revision_requested: "bg-amber-50 text-amber-700",
  sent_to_title: "bg-purple-50 text-purple-700",
};
const STATUS_LABELS = {
  draft: "Draft", sent_to_agent: "Awaiting Your Approval", approved: "Approved",
  revision_requested: "Revision Requested", sent_to_title: "Sent to Title",
};

function StatementRow({ statement, onApprove, onRequestRevision, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const s = statement;

  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ "--tw-bg-opacity": 1 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.property_address}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}>
                {STATUS_LABELS[s.status] || s.status}
              </span>
              {s.closing_date && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Closing: {s.closing_date}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-base font-bold text-emerald-700 hidden sm:block">{fmt$(s.agent_net)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: "var(--card-border)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            {[
              { label: "Purchase Price", value: fmt$(s.purchase_price) },
              { label: "Gross Commission", value: fmt$(s.gross_commission) },
              { label: `Brokerage Split (${s.brokerage_split_percent || 0}%)`, value: `−${fmt$(s.brokerage_split_amount)}` },
              { label: "Agent Net", value: fmt$(s.agent_net), highlight: true },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: item.highlight ? "var(--success-bg)" : "var(--bg-tertiary)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                <p className={`text-sm font-bold ${item.highlight ? "text-emerald-700" : ""}`} style={!item.highlight ? { color: "var(--text-primary)" } : {}}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {(s.referral_fee > 0 || s.tc_fee > 0 || s.transaction_fee > 0) && (
            <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
              {s.referral_fee > 0 && <p>Referral Fee: −{fmt$(s.referral_fee)}</p>}
              {s.tc_fee > 0 && <p>TC Fee: −{fmt$(s.tc_fee)}</p>}
              {s.transaction_fee > 0 && <p>Transaction Fee: −{fmt$(s.transaction_fee)}</p>}
            </div>
          )}

          {s.notes && (
            <p className="text-xs rounded-lg p-3 italic" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
              {s.notes}
            </p>
          )}

          {s.status === "sent_to_agent" && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => onApprove(s.id)}
                disabled={isPending}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRequestRevision(s.id)}
                disabled={isPending}
                className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Revision
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentCommissionApproval({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: statements = [] } = useQuery({
    queryKey: ["agent_commission_statements", currentUser?.email],
    queryFn: () => base44.entities.CommissionStatement.filter({ agent_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommissionStatement.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent_commission_statements"] }),
  });

  const handleApprove = (id) => {
    updateMutation.mutate({ id, data: { status: "approved", agent_approved: true, approved_at: new Date().toISOString() } });
  };

  const handleRequestRevision = (id) => {
    updateMutation.mutate({ id, data: { status: "revision_requested" } });
  };

  if (statements.length === 0) return null;

  const pending = statements.filter(s => s.status === "sent_to_agent");
  const others = statements.filter(s => s.status !== "sent_to_agent");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Commission Statements
          {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-blue-600 text-white">
              {pending.length}
            </span>
          )}
        </h2>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Awaiting Your Approval</p>
          {pending.map(s => (
            <StatementRow
              key={s.id}
              statement={s}
              onApprove={handleApprove}
              onRequestRevision={handleRequestRevision}
              isPending={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Previous Statements</p>
          {others.map(s => (
            <StatementRow
              key={s.id}
              statement={s}
              onApprove={handleApprove}
              onRequestRevision={handleRequestRevision}
              isPending={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}