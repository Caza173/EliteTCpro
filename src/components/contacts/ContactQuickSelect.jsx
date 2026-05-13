import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown } from "lucide-react";

/**
 * Reusable quick-select dropdown for contacts.
 * Usage:
 *   <ContactQuickSelect
 *     contactType="lender"         // filter by type
 *     currentUser={currentUser}
 *     value={selectedContact}
 *     onChange={(contact) => { // contact object or null }}
 *     placeholder="Select lender…"
 *     onFill={(contact) => {       // auto-fill parent form fields
 *       setForm(p => ({ ...p, lender_name: contact.first_name + " " + contact.last_name, ... }))
 *     }}
 *   />
 */
export default function ContactQuickSelect({ contactType, currentUser, value, onChange, placeholder, onFill }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", currentUser?.id, contactType],
    queryFn: () => base44.entities.Contact.filter({ owner_id: currentUser?.id, is_active: true, ...(contactType ? { contact_type: contactType } : {}) }),
    enabled: !!currentUser?.id,
    staleTime: 60000,
  });

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q || `${c.first_name} ${c.last_name} ${c.company_name || ""} ${c.email || ""}`.toLowerCase().includes(q);
  });

  const displayValue = value ? `${value.first_name} ${value.last_name}` : "";

  const handleSelect = (c) => {
    onChange(c);
    onFill?.(c);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{ borderColor: "var(--input-border)", color: "var(--text-primary)" }}
      >
        <span className={displayValue ? "" : "text-gray-400"}>{displayValue || placeholder || "Select contact…"}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                className="w-full text-sm pl-8 pr-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No contacts found.</p>
            ) : filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-gray-500">{c.company_name || c.brokerage_name || c.email || ""}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}