import React, { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";

const CONTACT_TYPES = ["buyer","seller","agent","lender","title","inspector","attorney","vendor","tc","other"];

const BLANK = {
  contact_type: "other", first_name: "", last_name: "", company_name: "",
  email: "", phone: "", mobile_phone: "", website: "", license_number: "",
  brokerage_name: "", street: "", city: "", state: "", zip: "", notes: "",
  tags: [], is_favorite: false, is_active: true,
};

export default function ContactFormModal({ contact, onClose, onSaved, currentUser }) {
  const [form, setForm] = useState(contact ? { ...BLANK, ...contact } : BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, owner_id: currentUser?.id };
    if (contact?.id) {
      await base44.entities.Contact.update(contact.id, payload);
    } else {
      await base44.entities.Contact.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{contact ? "Edit Contact" : "New Contact"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input className="mt-1" value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input className="mt-1" value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
            </div>
            <div>
              <Label>Contact Type</Label>
              <Select value={form.contact_type} onValueChange={v => set("contact_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company Name</Label>
              <Input className="mt-1" value={form.company_name} onChange={e => set("company_name", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" className="mt-1" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Mobile Phone</Label>
              <Input className="mt-1" value={form.mobile_phone} onChange={e => set("mobile_phone", e.target.value)} />
            </div>
            <div>
              <Label>Brokerage Name</Label>
              <Input className="mt-1" value={form.brokerage_name} onChange={e => set("brokerage_name", e.target.value)} />
            </div>
            <div>
              <Label>License Number</Label>
              <Input className="mt-1" value={form.license_number} onChange={e => set("license_number", e.target.value)} />
            </div>
            <div>
              <Label>Website</Label>
              <Input className="mt-1" value={form.website} onChange={e => set("website", e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Street</Label>
                <Input className="mt-1" value={form.street} onChange={e => set("street", e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input className="mt-1" value={form.city} onChange={e => set("city", e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input className="mt-1" value={form.state} onChange={e => set("state", e.target.value)} />
              </div>
              <div>
                <Label>Zip</Label>
                <Input className="mt-1" value={form.zip} onChange={e => set("zip", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 h-20 resize-none"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.is_favorite} onChange={e => set("is_favorite", e.target.checked)} className="rounded" />
              Mark as Favorite
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded" />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : contact ? "Update" : "Create Contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}