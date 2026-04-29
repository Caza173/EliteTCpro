import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Send, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES = {
  draft:     { cls: "bg-gray-100 text-gray-600 border-gray-200", label: "Draft" },
  sent:      { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Sent" },
  paid:      { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Paid" },
  overdue:   { cls: "bg-red-50 text-red-700 border-red-200", label: "Overdue" },
  cancelled: { cls: "bg-gray-50 text-gray-500 border-gray-200", label: "Cancelled" },
};

export default function InvoiceDetailModal({ invoice, onClose, onSend, onMarkPaid, sendingId }) {
  const st = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
  const invNum = invoice.invoice_number || `INV-${invoice.id?.slice(-6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>{invNum}</span>
            <Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Billed To</p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{invoice.client_name}</p>
              <p style={{ color: "var(--text-secondary)" }}>{invoice.client_email}</p>
              {invoice.property_address && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{invoice.property_address}</p>}
            </div>
            <div className="text-right">
              {invoice.due_date && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Due Date</p>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(new Date(invoice.due_date), "MMMM d, yyyy")}</p>
                </>
              )}
              {invoice.sent_at && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Sent {format(new Date(invoice.sent_at), "MMM d, yyyy")}
                </p>
              )}
              {invoice.paid_at && (
                <p className="text-xs mt-1 text-emerald-600 font-semibold">
                  Paid {format(new Date(invoice.paid_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {(invoice.line_items || []).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-t text-sm" style={{ borderColor: "var(--border)" }}>
                <div className="col-span-6" style={{ color: "var(--text-primary)" }}>{item.description}</div>
                <div className="col-span-2 text-center" style={{ color: "var(--text-secondary)" }}>{item.quantity}</div>
                <div className="col-span-2 text-right" style={{ color: "var(--text-secondary)" }}>{fmt(item.unit_price)}</div>
                <div className="col-span-2 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(item.amount)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1 text-sm border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Tax ({invoice.tax_rate}%)</span><span>{fmt(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <span>Total</span><span>{fmt(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-3 rounded-lg border-l-4 border-blue-400 text-sm" style={{ background: "var(--bg-tertiary)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
              <p style={{ color: "var(--text-secondary)" }}>{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
            {(invoice.status === "draft" || invoice.status === "sent") && (
              <Button
                onClick={() => onSend(invoice)}
                disabled={sendingId === invoice.id}
                className="flex-1 gap-2"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {sendingId === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {invoice.status === "sent" ? "Resend Email" : "Send Invoice"}
              </Button>
            )}
            {invoice.status === "sent" && (
              <Button onClick={() => onMarkPaid(invoice.id)} variant="outline" className="flex-1 gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                <CheckCircle className="w-4 h-4" /> Mark Paid
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}