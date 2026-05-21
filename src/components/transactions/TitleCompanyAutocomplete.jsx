import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function TitleCompanyAutocomplete({ value, onChange, placeholder = "NH Title & Escrow Co." }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  // Load distinct title companies from past transactions
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    base44.entities.Transaction.list("-created_date", 200)
      .then(txs => {
        const seen = new Set();
        const names = [];
        for (const tx of txs) {
          const name = tx.closing_title_company?.trim();
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            names.push(name);
          }
        }
        setSuggestions(names.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, [loaded]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = suggestions.filter(s => s.toLowerCase().includes((value || "").toLowerCase()));

  return (
    <div ref={ref} className="relative mt-1.5">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}>
          {filtered.map(name => (
            <button
              key={name}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50/10 transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}