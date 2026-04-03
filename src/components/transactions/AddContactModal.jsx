import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ROLES = [
  "Buyer", "Seller", "Buyer's Agent", "Seller's Agent",
  "Lender", "Title Company", "Inspector", "Appraiser",
  "Attorney", "Transaction Coordinator", "Other",
];

const ROLE_COLORS = {
  "Buyer": "#2563EB",
  "Seller": "#16a34a",
  "Buyer's Agent": "#7c3aed",
  "Seller's Agent": "#7c3aed",
  "Transaction Coordinator": "#0891b2",
  "Lender": "#d97706",
  "Title Company": "#db2777",
  "Inspector": "#059669",
  "Appraiser": "#6366f1",
  "Attorney": "#64748b",
  "Other": "#94a3b8",
};

const EMPTY = { name: "", role: "Other", email: "", phone: "", company: "" };

export default function AddContactModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, color: ROLE_COLORS[form.role] || "#94a3b8" });
    setForm(EMPTY);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Add Contact</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Role</label>
            <select
              className="w-full text-sm rounded-lg px-3 py-2 border outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              value={form.role}
              onChange={e => set("role", e.target.value)}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Full Name *</label>
            <input
              className="w-full text-sm rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-blue-300"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Company / Firm</label>
            <input
              className="w-full text-sm rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-blue-300"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              value={form.company}
              onChange={e => set("company", e.target.value)}
              placeholder="Acme Realty"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Email</label>
              <input
                type="email"
                className="w-full text-sm rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-blue-300"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Phone</label>
              <input
                className="w-full text-sm rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-blue-300"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="(603) 555-0100"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!form.name.trim()} onClick={handleSave}>
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  );
}