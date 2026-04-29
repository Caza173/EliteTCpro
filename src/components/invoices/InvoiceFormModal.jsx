import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

const newItem = () => ({ description: "", quantity: 1, unit_price: 0, amount: 0 });

const fmt = (n) => parseFloat((n || 0).toFixed(2));

export default function InvoiceFormModal({ invoice, currentUser, onClose, onSaved }) {

  const isEdit = !!invoice;

  const [form, setForm] = useState({
    invoice_number: "",
    client_name: "",
    client_email: "",
    agent_name: currentUser?.full_name || "",
    property_address: "",
    due_date: "",
    tax_rate: 0,
    notes: "",
    transaction_side: "buyer",
    line_items: [newItem()],
  });

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number || "",
        client_name: invoice.client_name || "",
        client_email: invoice.client_email || "",
        agent_name: invoice.agent_name || "",
        property_address: invoice.property_address || "",
        due_date: invoice.due_date || "",
        tax_rate: invoice.tax_rate || 0,
        notes: invoice.notes || "",
        transaction_side: invoice.transaction_side || "buyer",
        line_items: invoice.line_items?.length ? invoice.line_items : [newItem()],
      });
    }
  }, [invoice]);

  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.line_items];
      items[idx] = { ...items[idx], [field]: val };
      if (field === "quantity" || field === "unit_price") {
        items[idx].amount = fmt((items[idx].quantity || 0) * (items[idx].unit_price || 0));
      }
      return { ...f, line_items: items };
    });
  };

  const subtotal = fmt(form.line_items.reduce((s, i) => s + (i.amount || 0), 0));
  const taxAmount = fmt(subtotal * ((form.tax_rate || 0) / 100));
  const total = fmt(subtotal + taxAmount);

  const [error, setError] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) return base44.entities.Invoice.update(invoice.id, data);
      return base44.entities.Invoice.create(data);
    },
    onSuccess: onSaved,
    onError: (err) => setError(err?.response?.data?.message || err.message || "Failed to save invoice"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      subtotal,
      tax_amount: taxAmount,
      total,
      brokerage_id: currentUser?.brokerage_id || "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Invoice" : "New Invoice"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Invoice # and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Invoice #</Label>
              <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Client Name *</Label>
              <Input required value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Jane Smith" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Client Email *</Label>
              <Input required type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="jane@email.com" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Your Name</Label>
              <Input value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Property Address</Label>
              <Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} placeholder="123 Main St" className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Transaction Side</Label>
            <div className="flex gap-2">
              {["buyer", "seller", "both"].map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, transaction_side: side }))}
                  className="flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all"
                  style={form.transaction_side === side
                    ? { background: "var(--accent)", color: "var(--accent-text)", borderColor: "var(--accent)" }
                    : { background: "var(--bg-tertiary)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Line Items</Label>
              <button type="button" onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, newItem()] }))}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1" />
              </div>

              {form.line_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t items-center" style={{ borderColor: "var(--border)" }}>
                  <div className="col-span-5">
                    <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="TC coordination fee" className="h-7 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right" />
                  </div>
                  <div className="col-span-2 text-right text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    ${(item.amount || 0).toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {form.line_items.length > 1 && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))}
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-3" style={{ color: "var(--text-secondary)" }}>
              <span>Tax %</span>
              <Input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))} className="h-7 w-20 text-xs text-right" />
            </div>
            {form.tax_rate > 0 && (
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Tax</span><span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Notes (optional)</Label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Payment terms, instructions, etc."
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? "Save Changes" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}