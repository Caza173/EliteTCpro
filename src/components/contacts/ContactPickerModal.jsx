import React, { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search, UserPlus, Check } from "lucide-react";
import ContactFormModal from "./ContactFormModal";

const ROLES = ["buyer","seller","agent","lender","title","inspector","attorney","vendor","tc","other"];

export default function ContactPickerModal({ transactionId, currentUser, onClose, onLinked }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("other");
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", currentUser?.id],
    queryFn: () => base44.entities.Contact.filter({ owner_id: currentUser?.id, is_active: true }),
    enabled: !!currentUser?.id,
  });

  const { data: linked = [] } = useQuery({
    queryKey: ["transactionContacts", transactionId],
    queryFn: () => base44.entities.TransactionContact.filter({ transaction_id: transactionId }),
    enabled: !!transactionId,
  });

  const linkMutation = useMutation({
    mutationFn: (contact) => base44.entities.TransactionContact.create({
      transaction_id: transactionId,
      contact_id: contact.id,
      owner_id: currentUser?.id,
      role,
      is_primary: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactionContacts", transactionId] });
      onLinked?.();
    },
  });

  const linkedIds = new Set(linked.map(l => l.contact_id));

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q || `${c.first_name} ${c.last_name} ${c.email} ${c.company_name}`.toLowerCase().includes(q);
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Link Contact</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-4 space-y-3 flex-shrink-0 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium w-12">Role:</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No contacts found.</p>
          ) : filtered.map(c => {
            const isLinked = linkedIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-500">{c.company_name || c.brokerage_name || c.email || c.contact_type}</p>
                </div>
                {isLinked ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><Check className="w-3.5 h-3.5" /> Linked</span>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => linkMutation.mutate(c)} disabled={linkMutation.isPending}>
                    Link
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowNew(true)}>
            <UserPlus className="w-4 h-4" /> Create New Contact
          </Button>
        </div>
      </div>

      {showNew && (
        <ContactFormModal
          currentUser={currentUser}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            queryClient.invalidateQueries({ queryKey: ["contacts", currentUser?.id] });
          }}
        />
      )}
    </div>,
    document.body
  );
}