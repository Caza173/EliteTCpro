import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/**
 * Dropdown that lists all Contact records with contact_type = "tc".
 * On selection, calls onSelect({ name, email }) so the parent can
 * populate the agent / agent_email fields.
 */
export default function TCPickerSelect({ value, onSelect, className = "" }) {
  const { data: tcContacts = [], isLoading } = useQuery({
    queryKey: ["tc-contacts"],
    queryFn: () => base44.entities.Contact.filter({ contact_type: "tc" }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1.5">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading TCs…
      </div>
    );
  }

  const selectedId =
    tcContacts.find(
      (c) =>
        `${c.first_name} ${c.last_name}`.trim() === value ||
        c.email === value
    )?.id || "";

  return (
    <Select
      value={selectedId}
      onValueChange={(id) => {
        const contact = tcContacts.find((c) => c.id === id);
        if (contact) {
          onSelect({
            name: `${contact.first_name} ${contact.last_name}`.trim(),
            email: contact.email || "",
          });
        }
      }}
    >
      <SelectTrigger className={`mt-1.5 ${className}`}>
        <SelectValue placeholder="Select a Transaction Coordinator…" />
      </SelectTrigger>
      <SelectContent>
        {tcContacts.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">
            No TCs found. Add one in Contacts with type "TC".
          </div>
        ) : (
          tcContacts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="font-medium">
                {c.first_name} {c.last_name}
              </span>
              {c.email && (
                <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}