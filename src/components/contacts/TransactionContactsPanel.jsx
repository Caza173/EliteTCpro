import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, Star } from "lucide-react";
import ContactPickerModal from "./ContactPickerModal";

const TYPE_COLORS = {
  buyer: "bg-blue-100 text-blue-700", seller: "bg-purple-100 text-purple-700",
  agent: "bg-emerald-100 text-emerald-700", lender: "bg-amber-100 text-amber-700",
  title: "bg-cyan-100 text-cyan-700", inspector: "bg-orange-100 text-orange-700",
  attorney: "bg-rose-100 text-rose-700", vendor: "bg-gray-100 text-gray-700",
  tc: "bg-indigo-100 text-indigo-700", other: "bg-gray-100 text-gray-600",
};

export default function TransactionContactsPanel({ transaction, currentUser }) {
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: links = [] } = useQuery({
    queryKey: ["transactionContacts", transaction.id],
    queryFn: () => base44.entities.TransactionContact.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const contactIds = [...new Set(links.map(l => l.contact_id))];

  const { data: contacts = [] } = useQuery({
    queryKey: ["contactsByIds", contactIds.join(",")],
    queryFn: async () => {
      if (!contactIds.length) return [];
      const all = await base44.entities.Contact.filter({ owner_id: currentUser?.id });
      return all.filter(c => contactIds.includes(c.id));
    },
    enabled: contactIds.length > 0,
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId) => base44.entities.TransactionContact.delete(linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactionContacts", transaction.id] }),
  });

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Linked Contacts</p>
        <Button size="sm" variant="outline" onClick={() => setShowPicker(true)} className="gap-1 text-xs h-7">
          <UserPlus className="w-3 h-3" /> Add
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No contacts linked to this transaction.</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => {
            const c = contactMap[link.contact_id];
            if (!c) return null;
            return (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                  {(c.first_name?.[0] || "") + (c.last_name?.[0] || "")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.first_name} {c.last_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[link.role] || TYPE_COLORS.other}`}>
                      {link.role}
                    </span>
                    {c.email && <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{c.email}</span>}
                  </div>
                </div>
                <button onClick={() => unlinkMutation.mutate(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showPicker && (
        <ContactPickerModal
          transactionId={transaction.id}
          currentUser={currentUser}
          onClose={() => setShowPicker(false)}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey: ["transactionContacts", transaction.id] });
            queryClient.invalidateQueries({ queryKey: ["contactsByIds", contactIds.join(",")] });
          }}
        />
      )}
    </div>
  );
}