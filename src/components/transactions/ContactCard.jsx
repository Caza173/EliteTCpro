import React, { useState, useEffect } from "react";
import { Phone, Mail, Building2, Pencil, Check, X } from "lucide-react";

function formatPhone(val) {
  if (!val) return val;
  const digits = val.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return val;
}

const inputCls = "w-full text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-800 placeholder-gray-300";

export default function ContactCard({
  name, role, email, phone, company, accent = "#2563EB",
  canEdit = false,
  onSave,
  onEmailClick,
  fields = {},
}) {
  const showName    = fields.name    !== false;
  const showEmail   = fields.email   !== false;
  const showPhone   = fields.phone   !== false;
  const showCompany = fields.company !== false;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name, email, phone, company });

  useEffect(() => {
    if (!editing) setDraft({ name, email, phone, company });
  }, [name, email, phone, company, editing]);

  if (!editing && !name && !email && !phone) return null;

  const initials = (editing ? draft.name : name)
    ? (editing ? draft.name : name).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : role?.[0]?.toUpperCase() || "?";

  const handleEdit = () => { setDraft({ name, email, phone, company }); setEditing(true); };
  const handleCancel = () => { setDraft({ name, email, phone, company }); setEditing(false); };
  const handleSave = () => { if (onSave) onSave(draft); setEditing(false); };

  return (
    <div
      className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow relative"
      style={{ borderColor: "var(--card-border)", padding: "10px 12px" }}
    >
      {/* Edit toggle */}
      {canEdit && !editing && (
        <button
          onClick={handleEdit}
          className="absolute top-2 right-2 p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          title="Edit contact"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ backgroundColor: accent }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 pr-5">
          {editing && showName ? (
            <input
              className={inputCls}
              placeholder="Name"
              value={draft.name || ""}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              autoFocus
            />
          ) : (
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{name || "—"}</p>
          )}
          <p className="text-xs font-medium leading-tight" style={{ color: accent }}>{role}</p>
        </div>
      </div>

      {/* Company — view: only render if has value; edit: always show if field enabled */}
      {editing && showCompany ? (
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3 h-3 flex-shrink-0 text-gray-300" />
          <input
            className={inputCls}
            placeholder="Company"
            value={draft.company || ""}
            onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
          />
        </div>
      ) : company ? (
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3 h-3 flex-shrink-0 text-gray-300" />
          <span className="text-xs text-gray-500 truncate">{company}</span>
        </div>
      ) : null}

      {/* Phone — view: only render if has value; edit: always show if field enabled */}
      {editing && showPhone ? (
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-3 h-3 flex-shrink-0 text-gray-300" />
          <input
            type="tel"
            className={inputCls}
            placeholder="Add phone"
            value={draft.phone || ""}
            onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
          />
        </div>
      ) : phone ? (
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-3 h-3 flex-shrink-0 text-gray-300" />
          <a href={`tel:${phone}`} className="text-xs text-gray-600 hover:text-blue-600 transition-colors truncate">
            {formatPhone(phone)}
          </a>
        </div>
      ) : null}

      {/* Email — view: only render if has value; edit: always show if field enabled */}
      {editing && showEmail ? (
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-3 h-3 flex-shrink-0 text-gray-300" />
          <input
            type="email"
            className={inputCls}
            placeholder="Add email"
            value={draft.email || ""}
            onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
          />
        </div>
      ) : email ? (
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-3 h-3 flex-shrink-0 text-gray-300" />
          {onEmailClick ? (
            <button
              onClick={() => onEmailClick(email, name)}
              className="text-xs text-gray-600 hover:text-blue-600 transition-colors truncate text-left"
            >
              {email}
            </button>
          ) : (
            <a href={`mailto:${email}`} className="text-xs text-gray-600 hover:text-blue-600 transition-colors truncate">
              {email}
            </a>
          )}
        </div>
      ) : null}

      {/* Save / Cancel */}
      {editing && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1 rounded-md transition-colors"
            style={{ background: accent }}
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}