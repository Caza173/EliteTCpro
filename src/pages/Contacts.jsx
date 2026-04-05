import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Mail, Phone, Building2, Pencil, X, Check, Trash2 } from "lucide-react";

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "Agent",         label: "Agents" },
  { id: "Title Company", label: "Title Companies" },
  { id: "Lender",        label: "Lenders" },
  { id: "Inspector",     label: "Inspectors" },
  { id: "Appraiser",     label: "Appraisers" },
  { id: "Attorney",      label: "Attorneys" },
  { id: "Buyer",         label: "Buyers" },
  { id: "Seller",        label: "Sellers" },
  { id: "TC",            label: "TCs" },
];

const ROLE_STYLES = {
  "Buyer's Agent":  "bg-blue-50 text-blue-700 border-blue-200",
  "Seller's Agent": "bg-purple-50 text-purple-700 border-purple-200",
  "Buyer":          "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Seller":         "bg-orange-50 text-orange-700 border-orange-200",
  "TC":             "bg-slate-100 text-slate-600 border-slate-200",
  "Title Company":  "bg-rose-50 text-rose-700 border-rose-200",
  "Lender":         "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Inspector":      "bg-amber-50 text-amber-700 border-amber-200",
  "Appraiser":      "bg-teal-50 text-teal-700 border-teal-200",
  "Attorney":       "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const ROLE_CATEGORY = {
  "Buyer's Agent":  "Agent",
  "Seller's Agent": "Agent",
  "Buyer":          "Buyer",
  "Seller":         "Seller",
  "TC":             "TC",
  "Title Company":  "Title Company",
  "Lender":         "Lender",
  "Inspector":      "Inspector",
  "Appraiser":      "Appraiser",
  "Attorney":       "Attorney",
};

// Maps a contact's primary role to the transaction fields it originated from
const ROLE_FIELD_MAP = {
  "Buyer's Agent":  { name: "buyers_agent_name", email: "buyers_agent_email", phone: "buyers_agent_phone", company: "buyer_brokerage" },
  "Seller's Agent": { name: "sellers_agent_name", email: "sellers_agent_email", phone: "sellers_agent_phone", company: "seller_brokerage" },
  "TC":             { name: "agent", email: "agent_email", phone: null, company: "agent_company" },
  "Title Company":  { name: "title_company_contact_name", email: "title_company_email", phone: "title_company_phone", company: "closing_title_company" },
  "Lender":         { name: "lender_name", email: "lender_email", phone: "lender_phone", company: "lender_company" },
  "Inspector":      { name: "inspector_name", email: "inspector_email", phone: "inspector_phone", company: "inspector_company" },
  "Appraiser":      { name: "appraiser_name", email: "appraiser_email", phone: "appraiser_phone", company: "appraiser_company" },
  "Attorney":       { name: "attorney_name", email: "attorney_email", phone: "attorney_phone", company: "attorney_firm" },
  "Buyer":          { name: "__buyer_array__", email: "client_email", phone: "client_phone", company: null },
  "Seller":         { name: "__seller_array__", email: "sellerEmail", phone: "sellerPhone", company: null },
};

function extractContacts(transactions) {
  const map = new Map();

  const add = (name, email, phone, company, role, address, txId) => {
    if (!name && !email) return;
    const key = `${role}:${(email || name).toLowerCase().trim()}`;
    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.transactions.find(t => t.address === address)) {
        existing.transactions.push({ address, txId });
      }
      return;
    }
    map.set(key, { name, email, phone, company, roles: [role], category: ROLE_CATEGORY[role] || role, transactions: [{ address, txId }], key });
  };

  for (const tx of transactions) {
    const addr = tx.address || "Unknown";
    const id = tx.id;

    const buyerNames = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
    buyerNames.forEach(n => add(n, null, null, null, "Buyer", addr, id));

    const sellerNames = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
    sellerNames.forEach(n => add(n, null, null, null, "Seller", addr, id));

    if (tx.buyers_agent_name || tx.buyers_agent_email)
      add(tx.buyers_agent_name, tx.buyers_agent_email, tx.buyers_agent_phone, tx.buyer_brokerage, "Buyer's Agent", addr, id);

    if (tx.sellers_agent_name || tx.sellers_agent_email)
      add(tx.sellers_agent_name, tx.sellers_agent_email, tx.sellers_agent_phone, tx.seller_brokerage, "Seller's Agent", addr, id);

    if (tx.agent || tx.agent_email)
      add(tx.agent, tx.agent_email, null, tx.agent_company || null, "TC", addr, id);

    if (tx.title_company_contact_name || tx.title_company_email)
      add(tx.title_company_contact_name, tx.title_company_email, tx.title_company_phone, tx.closing_title_company, "Title Company", addr, id);

    if (tx.lender_name || tx.lender_email)
      add(tx.lender_name, tx.lender_email, tx.lender_phone, tx.lender_company, "Lender", addr, id);

    if (tx.inspector_name || tx.inspector_email)
      add(tx.inspector_name, tx.inspector_email, tx.inspector_phone, tx.inspector_company, "Inspector", addr, id);

    if (tx.appraiser_name || tx.appraiser_email)
      add(tx.appraiser_name, tx.appraiser_email, tx.appraiser_phone, tx.appraiser_company, "Appraiser", addr, id);

    if (tx.attorney_name || tx.attorney_email)
      add(tx.attorney_name, tx.attorney_email, tx.attorney_phone, tx.attorney_firm, "Attorney", addr, id);
  }

  return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

function EditContactModal({ contact, transactions, queryClient, onClose }) {
   const [form, setForm] = useState({
     name: contact.name || "",
     email: contact.email || "",
     phone: contact.phone || "",
     company: contact.company || "",
   });
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState(null);

   const fieldMap = ROLE_FIELD_MAP[contact.roles[0]];

   const handleSave = async () => {
     if (!fieldMap) { onClose(); return; }
     setSaving(true);
     setError(null);
     try {
       for (const { txId } of contact.transactions) {
         const tx = transactions.find(t => t.id === txId);
         if (!tx) continue;
         const data = {};

         if (fieldMap.name === "__buyer_array__") {
           const arr = tx.buyers?.length ? [...tx.buyers] : (tx.buyer ? [tx.buyer] : []);
           const idx = arr.findIndex(n => n === contact.name);
           if (idx >= 0) arr[idx] = form.name; else arr.push(form.name);
           data.buyers = arr;
           data.buyer = arr[0] || form.name;
           if (form.email) data.client_email = form.email;
           if (form.phone) data.client_phone = form.phone;
         } else if (fieldMap.name === "__seller_array__") {
           const arr = tx.sellers?.length ? [...tx.sellers] : (tx.seller ? [tx.seller] : []);
           const idx = arr.findIndex(n => n === contact.name);
           if (idx >= 0) arr[idx] = form.name; else arr.push(form.name);
           data.sellers = arr;
           data.seller = arr[0] || form.name;
           if (form.email) data.sellerEmail = form.email;
           if (form.phone) data.sellerPhone = form.phone;
         } else {
           if (fieldMap.name) data[fieldMap.name] = form.name;
           if (fieldMap.email) data[fieldMap.email] = form.email;
           if (fieldMap.phone && form.phone) data[fieldMap.phone] = form.phone;
           if (fieldMap.company && form.company) data[fieldMap.company] = form.company;
         }

         console.log("Updating transaction", txId, "with data:", data);
         const result = await base44.entities.Transaction.update(txId, data);
         console.log("Update result:", result);
       }
       console.log("Refetching transactions...");
       await queryClient.refetchQueries({ queryKey: ["transactions"] });
       setSaving(false);
       onClose();
     } catch (e) {
       console.error("Error saving contact:", e);
       setError(e.message || "Failed to save. Please try again.");
       setSaving(false);
     }
   };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Edit Contact</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Name</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          {fieldMap?.email && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Email</label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" type="email" />
            </div>
          )}
          {fieldMap?.phone && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" type="tel" />
            </div>
          )}
          {fieldMap?.company && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Company</label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company / firm" />
            </div>
          )}
        </div>

        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
          Changes will update across {contact.transactions.length} transaction{contact.transactions.length > 1 ? "s" : ""}.
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [editingContact, setEditingContact] = useState(null);
  const [deletingContact, setDeletingContact] = useState(null);

  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const contacts = useMemo(() => extractContacts(transactions), [transactions]);

  const handleDelete = async (contact) => {
    const fieldMap = ROLE_FIELD_MAP[contact.roles[0]];
    if (!fieldMap) return;
    for (const { txId } of contact.transactions) {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) continue;
      const data = {};
      if (fieldMap.name === "__buyer_array__") {
        const arr = (tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : [])).filter(n => n !== contact.name);
        data.buyers = arr;
        data.buyer = arr[0] || "";
      } else if (fieldMap.name === "__seller_array__") {
        const arr = (tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : [])).filter(n => n !== contact.name);
        data.sellers = arr;
        data.seller = arr[0] || "";
      } else {
        if (fieldMap.name) data[fieldMap.name] = "";
        if (fieldMap.email) data[fieldMap.email] = "";
        if (fieldMap.phone) data[fieldMap.phone] = "";
        if (fieldMap.company) data[fieldMap.company] = "";
      }
      await base44.entities.Transaction.update(txId, data);
    }
    setDeletingContact(null);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const counts = useMemo(() => {
    const c = { all: contacts.length };
    contacts.forEach(contact => { c[contact.category] = (c[contact.category] || 0) + 1; });
    return c;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchTab = activeTab === "all" || c.category === activeTab;
      const matchSearch = !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [contacts, search, activeTab]);

  return (
    <div className="w-full space-y-5">
      {editingContact && (
         <EditContactModal
           contact={editingContact}
           transactions={transactions}
           queryClient={queryClient}
           onClose={() => setEditingContact(null)}
         />
       )}

      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Delete Contact</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Remove <strong>{deletingContact.name || deletingContact.email}</strong> from {deletingContact.transactions.length} transaction{deletingContact.transactions.length > 1 ? "s" : ""}? This will clear their info from those transactions.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setDeletingContact(null)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(deletingContact)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Contacts</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          All parties from your transactions — {contacts.length} total
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
        {CATEGORIES.filter(cat => cat.id === "all" || (counts[cat.id] || 0) > 0).map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === cat.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {cat.label}
            {counts[cat.id] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === cat.id ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
              }`}>
                {counts[cat.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <Input
          placeholder="Search by name, email, or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contacts found</p>
        </div>
      ) : (
        <div className="theme-card overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Contact</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--bg-hover)] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {(contact.name || contact.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-xs" style={{ color: "var(--text-primary)" }}>
                          {contact.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </span>
                        {(contact.roles[0] === "Buyer" || contact.roles[0] === "Seller") && contact.transactions[0]?.address && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{contact.transactions[0].address}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {contact.email && (
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <a href={`mailto:${contact.email}`} className="hover:underline text-xs truncate">{contact.email}</a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="text-xs">{contact.phone}</span>
                        </div>
                      )}
                      {!contact.email && !contact.phone && <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {contact.company ? (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs">{contact.company}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.roles.map(r => (
                        <Badge key={r} variant="outline" className={`text-xs ${ROLE_STYLES[r] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                   <div className="flex items-center gap-1">
                     <button
                       onClick={() => setEditingContact(contact)}
                       className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                       title="Edit contact"
                     >
                       <Pencil className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                     </button>
                     <button
                       onClick={() => setDeletingContact(contact)}
                       className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                       title="Delete contact"
                     >
                       <Trash2 className="w-3.5 h-3.5 text-red-400" />
                     </button>
                   </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}