import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Mail, Phone, Building2 } from "lucide-react";

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

// Each contact has a primary category for tab filtering
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

function extractContacts(transactions) {
  const map = new Map();

  const add = (name, email, phone, company, role, address) => {
    if (!name && !email) return;
    const key = `${role}:${(email || name).toLowerCase().trim()}`;
    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.transactions.includes(address)) existing.transactions.push(address);
      return;
    }
    map.set(key, { name, email, phone, company, roles: [role], category: ROLE_CATEGORY[role] || role, transactions: [address] });
  };

  for (const tx of transactions) {
    const addr = tx.address || "Unknown";

    const buyerNames = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
    buyerNames.forEach(n => add(n, null, null, null, "Buyer", addr));

    const sellerNames = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
    sellerNames.forEach(n => add(n, null, null, null, "Seller", addr));

    if (tx.buyers_agent_name || tx.buyers_agent_email)
      add(tx.buyers_agent_name, tx.buyers_agent_email, tx.buyers_agent_phone, tx.buyer_brokerage, "Buyer's Agent", addr);

    if (tx.sellers_agent_name || tx.sellers_agent_email)
      add(tx.sellers_agent_name, tx.sellers_agent_email, tx.sellers_agent_phone, tx.seller_brokerage, "Seller's Agent", addr);

    if (tx.agent || tx.agent_email)
      add(tx.agent, tx.agent_email, null, null, "TC", addr);

    if (tx.title_company_contact_name || tx.title_company_email)
      add(tx.title_company_contact_name, tx.title_company_email, tx.title_company_phone, tx.closing_title_company, "Title Company", addr);

    if (tx.lender_name || tx.lender_email)
      add(tx.lender_name, tx.lender_email, tx.lender_phone, tx.lender_company, "Lender", addr);

    if (tx.inspector_name || tx.inspector_email)
      add(tx.inspector_name, tx.inspector_email, tx.inspector_phone, tx.inspector_company, "Inspector", addr);

    if (tx.appraiser_name || tx.appraiser_email)
      add(tx.appraiser_name, tx.appraiser_email, tx.appraiser_phone, tx.appraiser_company, "Appraiser", addr);

    if (tx.attorney_name || tx.attorney_email)
      add(tx.attorney_name, tx.attorney_email, tx.attorney_phone, tx.attorney_firm, "Attorney", addr);
  }

  return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const contacts = useMemo(() => extractContacts(transactions), [transactions]);

  const counts = useMemo(() => {
    const c = { all: contacts.length };
    contacts.forEach(contact => {
      c[contact.category] = (c[contact.category] || 0) + 1;
    });
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
    <div className="max-w-5xl mx-auto space-y-5">
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
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--text-muted)" }}>Contact</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Company</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        {(contact.name || contact.email || "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {contact.name || <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {contact.email && (
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <a href={`mailto:${contact.email}`} className="hover:underline text-xs truncate max-w-[180px]">{contact.email}</a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="text-xs">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
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
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="space-y-0.5">
                      {contact.transactions.slice(0, 2).map((addr, j) => (
                        <p key={j} className="text-xs truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>{addr}</p>
                      ))}
                      {contact.transactions.length > 2 && (
                        <p className="text-xs" style={{ color: "var(--accent)" }}>+{contact.transactions.length - 2} more</p>
                      )}
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