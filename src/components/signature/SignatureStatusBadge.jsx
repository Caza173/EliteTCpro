import React from "react";
import { Badge } from "@/components/ui/badge";
import { PenLine } from "lucide-react";

const CONFIG = {
  draft:            { label: "Draft",            cls: "bg-gray-100 text-gray-600 border-gray-200" },
  sent:             { label: "Sent",             cls: "bg-blue-100 text-blue-700 border-blue-200" },
  viewed:           { label: "Viewed",           cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  partially_signed: { label: "Partially Signed", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  completed:        { label: "Signed ✓",         cls: "bg-green-100 text-green-700 border-green-200" },
  cancelled:        { label: "Cancelled",        cls: "bg-red-100 text-red-600 border-red-200" },
};

export default function SignatureStatusBadge({ status }) {
  if (!status) return null;
  const cfg = CONFIG[status] || CONFIG.draft;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.cls}`}>
      <PenLine className="w-2.5 h-2.5" />
      {cfg.label}
    </Badge>
  );
}