import React from "react";
import { Phone, Mail, Building2 } from "lucide-react";

function formatPhone(val) {
  if (!val) return val;
  const digits = val.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return val;
}

export default function ContactCard({ name, role, email, phone, company, accent = "#2563EB" }) {
  if (!name && !email && !phone) return null;

  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : role?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="rounded-xl border bg-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderColor: "var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ backgroundColor: accent }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{name || "—"}</p>
          <p className="text-xs font-medium" style={{ color: accent }}>{role}</p>
        </div>
      </div>

      {/* Company */}
      {company && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{company}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-1.5 mt-auto">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
            <span className="truncate">{formatPhone(phone)}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
            <span className="truncate">{email}</span>
          </a>
        )}
      </div>
    </div>
  );
}