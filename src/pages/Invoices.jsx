import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send, CheckCircle, Loader2, Trash2, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import InvoiceFormModal from "@/components/invoices/InvoiceFormModal";
import InvoiceDetailModal from "@/components/invoices/InvoiceDetailModal";

const STATUS_STYLES = {
  draft:     { cls: "bg-gray-100 text-gray-600 border-gray-200", label: "Draft" },
  sent:      { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Sent" },
  paid:      { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Paid" },
  overdue:   { cls: "bg-red-50 text-red-700 border-red-200", label: "Overdue" },
  cancelled: { cls: "bg-gray-50 text-gray-500 border-gray-200", label: "Cancelled" },
};

const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Invoices() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.update(id, { status: "paid", paid_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const handleSend = async (invoice) => {
    setSendingId(invoice.id);
    await base44.functions.invoke("sendInvoiceEmail", { invoice_id: invoice.id });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    setSendingId(null);
  };

  const totalOutstanding = invoices
    .filter(i => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalPaid = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Create and send invoices to clients.</p>
        </div>
        <Button onClick={() => { setEditingInvoice(null); setShowForm(true); }} className="gap-2" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoices", value: invoices.length, color: "var(--text-primary)" },
          { label: "Outstanding", value: fmt(totalOutstanding), color: "#D97706" },
          { label: "Collected", value: fmt(totalPaid), color: "#16A34A" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoice List */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-10 h-10 mx-auto opacity-20" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No invoices yet</p>
            <Button size="sm" onClick={() => { setEditingInvoice(null); setShowForm(true); }} variant="outline" className="gap-1.5">
              <Plus className="w-4 h-4" /> Create your first invoice
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {invoices.map((inv) => {
              const st = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
              return (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-opacity-50 transition-colors" style={{ background: "transparent" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {inv.invoice_number || `INV-${inv.id?.slice(-6).toUpperCase()}`}
                      </span>
                      <Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      {inv.client_name} · {inv.client_email}
                      {inv.property_address ? ` · ${inv.property_address}` : ""}
                    </p>
                    {inv.due_date && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Due {format(new Date(inv.due_date), "MMM d, yyyy")}
                        {inv.sent_at && ` · Sent ${format(new Date(inv.sent_at), "MMM d")}`}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{fmt(inv.total)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setViewingInvoice(inv)} className="p-1.5 rounded-lg transition-colors hover:bg-blue-50 text-blue-500" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {inv.status === "draft" && (
                      <button onClick={() => { setEditingInvoice(inv); setShowForm(true); }} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {(inv.status === "draft" || inv.status === "sent") && (
                      <button
                        onClick={() => handleSend(inv)}
                        disabled={sendingId === inv.id}
                        className="p-1.5 rounded-lg transition-colors text-blue-600 hover:bg-blue-50"
                        title="Send email"
                      >
                        {sendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                    {inv.status === "sent" && (
                      <button onClick={() => markPaidMutation.mutate(inv.id)} className="p-1.5 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-50" title="Mark as paid">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {inv.status === "draft" && (
                      <button
                        onClick={() => { if (window.confirm("Delete this invoice?")) deleteMutation.mutate(inv.id); }}
                        className="p-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceFormModal
          invoice={editingInvoice}
          currentUser={currentUser}
          onClose={() => { setShowForm(false); setEditingInvoice(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); setShowForm(false); setEditingInvoice(null); }}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetailModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onSend={handleSend}
          onMarkPaid={(id) => { markPaidMutation.mutate(id); setViewingInvoice(null); }}
          sendingId={sendingId}
        />
      )}
    </div>
  );
}