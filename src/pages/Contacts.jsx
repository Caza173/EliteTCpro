import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Mail, Phone, Building2 } from "lucide-react";

const ROLE_STYLES = {
  "Buyer's Agent":  "bg-blue-50 text-blue-700 border-blue-200",
  "Seller's Agent": "bg-purple-50 text-purple-700 border-purple-200",
  "Buyer":          "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Seller":         "bg-orange-50 text-orange-700 border-orange-200",
  "TC":             "bg-slate-100 text-slate-600 border-slate-200",
};

function extractContacts(transactions) {
  const map = new Map(); // keyed by email (or name fallback) to deduplicate

  const add = (name, email, phone, brokerage, role, address) => {
    if (!name && !email) return;
    const key = (email || name).toLowerCase().trim();
    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.transactions.includes(address)) existing.transactions.push(address);
      if (!existing.roles.includes(role)) existing.roles.push(role);
      return;
    }
    map.set(key, { name, email, phone, brokerage, roles: [role], transactions: [address] });
  };

  for (const tx of transactions) {
    const addr = tx.address || "Unknown";
    // Buyers
    const buyerNames = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
    buyerNames.forEach(n => add(n, null, null, null, "Buyer", addr));

    // Sellers
    const sellerNames = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
    sellerNames.forEach(n => add(n, null, null, null, "Seller", addr));

    // Buyer's Agent
    if (tx.buyers_agent_name || tx.buyers_agent_email) {
      add(tx.buyers_agent_name, tx.buyers_agent_email, tx.buyers_agent_phone, tx.buyer_brokerage, "Buyer's Agent", addr);
    }

    // Seller's Agent
    if (tx.sellers_agent_name || tx.sellers_agent_email) {
      add(tx.sellers_agent_name, tx.sellers_agent_email, tx.sellers_agent_phone, tx.seller_brokerage, "Seller's Agent", addr);
    }

    // TC
    if (tx.agent || tx.agent_email) {
      add(tx.agent, tx.agent_email, null, null, "TC", addr);
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [brokerageFilter, setBrokerageFilter] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const contacts = useMemo(() => extractContacts(transactions), [transactions]);

  const brokerages = useMemo(() => {
    const set = new Set(contacts.map(c => c.brokerage).filter(Boolean));
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchSearch = !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q);
      const matchBrokerage = !brokerageFilter || c.brokerage === brokerageFilter;
      return matchSearch && matchBrokerage;
    });
  }, [contacts, search, brokerageFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Contacts</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          All parties from your transactions — {contacts.length} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={brokerageFilter}
          onChange={e => setBrokerageFilter(e.target.value)}
          className="theme-input h-9 text-sm min-w-[200px]"
        >
          <option value="">All Brokerages</option>
          {brokerages.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
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
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Brokerage</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--text-muted)" }}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {/* Name */}
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
                  {/* Contact */}
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
                  {/* Brokerage */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {contact.brokerage ? (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs">{contact.brokerage}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  {/* Roles */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.roles.map(r => (
                        <Badge key={r} variant="outline" className={`text-xs ${ROLE_STYLES[r] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  {/* Transactions */}
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