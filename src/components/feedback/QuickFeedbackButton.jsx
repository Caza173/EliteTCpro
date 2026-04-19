import React, { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

/**
 * Drop this anywhere in the app to provide a contextual feedback entry point.
 * Pass `context` to auto-populate form fields.
 */
export default function QuickFeedbackButton({
  context = {},
  defaultType = "bug",
  label = "Report Issue",
  variant = "ghost", // "ghost" | "badge" | "icon"
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const baseStyle = {
    ghost: `flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80 ${className}`,
    badge: `flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border transition-colors hover:opacity-80 ${className}`,
    icon: `p-1.5 rounded-lg transition-colors hover:opacity-80 ${className}`,
  }[variant];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={baseStyle}
        title="Send Feedback"
      >
        <MessageSquarePlus className="w-3.5 h-3.5 flex-shrink-0" />
        {variant !== "icon" && <span>{label}</span>}
      </button>

      <FeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        defaultType={defaultType}
        context={context}
      />
    </>
  );
}