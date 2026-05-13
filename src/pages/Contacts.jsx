import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Star, Users, Filter } from "lucide-react";
import ContactCard from "@/components/contacts/ContactCard";
import ContactFormModal from "@/components/contacts/ContactFormModal";
import { useCurrentUser } from "@/components/auth/useCurrentUser";

const CONTACT_TYPES = ["all", "buyer", "seller", "agent", "lender", "title", "inspector", "attorney", "vendor", "tc", "other"];

export default function Contacts() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [formContact, setFormContact] = useState(null); // null=closed, {}=new, contact=edit
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", currentUser?.id],
    queryFn: () => base44.entities.Contact.filter({ owner_id: currentUser?.id }),
    enabled: !!currentUser?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentUser?.id] });
      setDeleteConfirm(null);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => base44.entities.Contact.update(id, { is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts", currentUser?.id] }),
  });

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (showFavoritesOnly && !c.is_favorite) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${c.first_name} ${c.last_name} ${c.email || ""} ${c.company_name || ""} ${c.brokerage_name || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, typeFilter, showFavoritesOnly, search]);

  const favorites = contacts.filter(c => c.is_favorite);
  const recent = [...contacts].sort((a, b) => (b.last_used_date || b.created_date || "").localeCompare(a.last_used_date || a.created_date || "")).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Contacts</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{contacts.length} total contacts</p>
        </div>
        <Button onClick={() => { setFormContact({}); setFormOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" /> New Contact
        </Button>
      </div>

      {/* Favorites strip */}
      {favorites.length > 0 && (
        <div className="theme-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Favorites
          </p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {favorites.map(c => (
              <button
                key={c.id}
                onClick={() => { setFormContact(c); setFormOpen(true); }}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-[64px]"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {(c.first_name?.[0] || "") + (c.last_name?.[0] || "")}
                </div>
                <p className="text-[10px] font-medium text-center truncate w-16" style={{ color: "var(--text-secondary)" }}>
                  {c.first_name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search by name, email, company…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFavoritesOnly(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFavoritesOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-amber-400 text-amber-400" : ""}`} /> Favorites
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CONTACT_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? `All (${contacts.length})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${contacts.filter(c => c.contact_type === t).length})`}
          </button>
        ))}
      </div>

      {/* Contacts grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-card p-10 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {search || typeFilter !== "all" || showFavoritesOnly ? "No contacts match your filters." : "No contacts yet."}
          </p>
          {!search && typeFilter === "all" && !showFavoritesOnly && (
            <button onClick={() => { setFormContact({}); setFormOpen(true); }} className="text-sm text-blue-600 hover:underline mt-2 font-medium">
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={(c) => { setFormContact(c); setFormOpen(true); }}
              onDelete={(c) => setDeleteConfirm(c)}
              onToggleFavorite={(c) => favoriteMutation.mutate({ id: c.id, is_favorite: !c.is_favorite })}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Contact?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <ContactFormModal
          contact={formContact?.id ? formContact : null}
          currentUser={currentUser}
          onClose={() => { setFormOpen(false); setFormContact(null); }}
          onSaved={() => {
            setFormOpen(false);
            setFormContact(null);
            queryClient.invalidateQueries({ queryKey: ["contacts", currentUser?.id] });
          }}
        />
      )}
    </div>
  );
}