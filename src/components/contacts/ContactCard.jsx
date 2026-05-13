import React, { useState, useRef, useEffect } from "react";
import { Mail, Phone, Building2, Star, Pencil, Trash2, Copy, Send } from "lucide-react";

const TYPE_COLORS = {
  buyer: "bg-blue-100 text-blue-700",
  seller: "bg-purple-100 text-purple-700",
  agent: "bg-emerald-100 text-emerald-700",
  lender: "bg-amber-100 text-amber-700",
  title: "bg-cyan-100 text-cyan-700",
  inspector: "bg-orange-100 text-orange-700",
  attorney: "bg-rose-100 text-rose-700",
  vendor: "bg-gray-100 text-gray-700",
  tc: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-600",
};

export default function ContactCard({ contact, onEdit, onDelete, onToggleFavorite, onEmail }) {
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase();
  const typeColor = TYPE_COLORS[contact.contact_type] || TYPE_COLORS.other;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCopyContactInfo = () => {
    const info = [
      contact.first_name && contact.last_name ? `${contact.first_name} ${contact.last_name}` : "",
      contact.email || "",
      contact.phone || "",
      contact.company_name || contact.brokerage_name || "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(info);
    setMenuOpen(false);
  };

  return (
    <div className="theme-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-semibold text-sm">
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {contact.first_name} {contact.last_name}
            </p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeColor}`}>
              {contact.contact_type}
            </span>
            {contact.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
          </div>
          {(contact.company_name || contact.brokerage_name) && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Building2 className="w-3 h-3" />
              {contact.company_name || contact.brokerage_name}
            </p>
          )}
          {contact.email && (
            <div className="relative mt-0.5">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-xs flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                title="Click for email options"
              >
                <Mail className="w-3 h-3" />
                {contact.email}
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute top-full left-0 mt-1 z-50 rounded-lg border shadow-lg py-1 w-48 text-xs"
                  style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                >
                  <button
                    onClick={() => { onEmail?.(contact); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Send className="w-3.5 h-3.5" /> Email
                  </button>
                  <button
                    onClick={handleCopyContactInfo}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Contact Info
                  </button>
                </div>
              )}
            </div>
          )}
          {contact.phone && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <Phone className="w-3 h-3" />
              {contact.phone}
            </p>
          )}
          {contact.transaction_count > 0 && (
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              {contact.transaction_count} transaction{contact.transaction_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onToggleFavorite(contact)} className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
            <Star className={`w-3.5 h-3.5 ${contact.is_favorite ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
          </button>
          <button onClick={() => onEdit(contact)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={() => onDelete(contact)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}