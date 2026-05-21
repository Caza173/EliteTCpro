import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Shows Agent Name, Email, Phone fields with a dropdown of past contacts.
 * Props: agentName, agentEmail, agentPhone, onChange({ agent, agent_email, agent_phone })
 */
export default function AgentContactAutocomplete({ agentName, agentEmail, agentPhone, onChange }) {
  const [contacts, setContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  // Load distinct agents from past transactions
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    base44.entities.Transaction.list("-created_date", 200)
      .then(txs => {
        const seen = new Set();
        const list = [];
        for (const tx of txs) {
          const name = tx.agent?.trim();
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            list.push({ name, email: tx.agent_email || "", phone: tx.client_phone || "" });
          }
        }
        setContacts(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
  }, [loaded]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = contacts.filter(c => c.name.toLowerCase().includes((agentName || "").toLowerCase()));

  const selectContact = (c) => {
    onChange({ agent: c.name, agent_email: c.email, agent_phone: c.phone });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Contact</p>

      {/* Dropdown picker */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors"
          style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <span>{agentName || "Select a previous agent or enter below…"}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden max-h-48 overflow-y-auto"
            style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}>
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: "var(--text-muted)" }}>No previous agents found</div>
            )}
            {filtered.map(c => (
              <button
                key={c.name}
                type="button"
                onMouseDown={e => { e.preventDefault(); selectContact(c); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50/10 transition-colors border-b last:border-0"
                style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
              >
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>{c.email}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual entry fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-sm font-medium text-gray-700">Agent / TC Name *</Label>
          <Input
            value={agentName || ""}
            onChange={e => onChange({ agent: e.target.value, agent_email: agentEmail, agent_phone: agentPhone })}
            placeholder="Full name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">Agent Email *</Label>
          <Input
            type="email"
            value={agentEmail || ""}
            onChange={e => onChange({ agent: agentName, agent_email: e.target.value, agent_phone: agentPhone })}
            placeholder="agent@brokerage.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">Agent Phone *</Label>
          <Input
            type="tel"
            value={agentPhone || ""}
            onChange={e => onChange({ agent: agentName, agent_email: agentEmail, agent_phone: e.target.value })}
            placeholder="(555) 123-4567"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}