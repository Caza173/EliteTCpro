import React, { useState } from "react";
import { ChevronDown, ChevronRight, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailTemplatePreview({ template, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(template.body || "");

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...template, body: editBody });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditBody(template.body || "");
    setEditing(false);
  };

  return (
    <div className="border-t" style={{ borderColor: "var(--card-border)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Email Body</span>
          </div>
          {!expanded && editBody && (
            <p className="text-xs mt-0.5 truncate text-gray-400">{editBody}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded && !editing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              title="Edit body"
            >
              <Edit2 className="w-4 h-4 text-blue-500" />
            </button>
          )}
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ background: "var(--bg-tertiary)" }}>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full h-48 px-3 py-2 rounded-lg border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                placeholder="Enter email body (supports {field_name} placeholders)"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="px-3 py-3 rounded-lg border whitespace-pre-wrap text-sm leading-relaxed"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)" }}
            >
              {editBody || <span style={{ color: "var(--text-muted)" }}>No email body defined. Click Edit to add content.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}