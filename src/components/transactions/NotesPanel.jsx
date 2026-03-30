import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pin, PinOff, Pencil, Trash2, ArrowRight, Mail, MoreHorizontal,
  Plus, ChevronDown, X, Check,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_TYPE_META = {
  internal:     { label: "Internal",      color: "bg-slate-100 text-slate-600"     },
  agent_action: { label: "Agent Action",  color: "bg-blue-100 text-blue-700"       },
  client_action:{ label: "Client Action", color: "bg-amber-100 text-amber-700"     },
  update:       { label: "Update",        color: "bg-emerald-100 text-emerald-700" },
};

const VISIBILITY_META = {
  internal: { label: "Internal", color: "text-slate-400" },
  agent:    { label: "→ Agent",  color: "text-blue-500"  },
  client:   { label: "→ Client", color: "text-amber-500" },
};

// ─── NoteCard ─────────────────────────────────────────────────────────────────

function NoteCard({ note, canEdit, onPin, onDelete, onEdit, onConvertToTask, onSendEmail }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.message);
  const menuRef = useRef(null);
  const typeMeta = NOTE_TYPE_META[note.note_type] || NOTE_TYPE_META.internal;
  const visMeta = VISIBILITY_META[note.visibility] || VISIBILITY_META.internal;

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSaveEdit = () => {
    if (draft.trim()) {
      onEdit(note.id, { message: draft.trim(), title: draft.trim().slice(0, 80) });
    }
    setEditing(false);
  };

  return (
    <div
      className="px-3 py-2.5 border-b transition-colors group"
      style={{
        borderColor: "var(--card-border)",
        background: note.is_pinned ? "rgba(37,99,235,0.03)" : "transparent",
        borderLeft: note.is_pinned ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {note.is_pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "var(--accent)" }} />}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeMeta.color}`}>{typeMeta.label}</span>
          <span className={`text-[10px] font-medium ${visMeta.color}`}>{visMeta.label}</span>
        </div>

        {canEdit && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
              style={{ color: "var(--text-muted)" }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-6 z-50 rounded-lg border shadow-lg py-1 w-44 text-xs"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <button onClick={() => { onPin(note); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  style={{ color: "var(--text-primary)" }}>
                  {note.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  {note.is_pinned ? "Unpin" : "Pin note"}
                </button>
                <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  style={{ color: "var(--text-primary)" }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { onConvertToTask(note); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  style={{ color: "var(--text-primary)" }}>
                  <ArrowRight className="w-3.5 h-3.5" /> Convert to Task
                </button>
                <button onClick={() => { onSendEmail(note); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  style={{ color: "var(--text-primary)" }}>
                  <Mail className="w-3.5 h-3.5" /> Send as Email
                </button>
                <div className="border-t my-1" style={{ borderColor: "var(--card-border)" }} />
                <button onClick={() => { onDelete(note.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-red-50 text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message */}
      {editing ? (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            autoFocus
            className="w-full rounded border px-2 py-1.5 text-xs resize-none"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="flex gap-1.5">
            <button onClick={handleSaveEdit} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-600 text-white">
              <Check className="w-3 h-3" /> Save
            </button>
            <button onClick={() => { setEditing(false); setDraft(note.message); }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{note.message}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span>{note.created_by_name || note.created_by || "Unknown"}</span>
        <span>·</span>
        <span>{note.created_date ? formatDistanceToNow(parseISO(note.created_date), { addSuffix: true }) : ""}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NotesPanel({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("internal");
  const [message, setMessage] = useState("");
  const [noteType, setNoteType] = useState("internal");
  const [visibility, setVisibility] = useState("internal");
  const [adding, setAdding] = useState(false);
  const feedRef = useRef(null);

  const role = currentUser?.role;
  const isTC = ["tc", "tc_lead", "admin", "owner"].includes(role) || currentUser?.email === "nhcazateam@gmail.com";
  const isAgent = role === "agent";
  const isClient = role === "client";

  // Agents default to shared visibility
  useEffect(() => {
    if (isAgent) setVisibility("agent");
  }, [isAgent]);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", transaction.id],
    queryFn: () => base44.entities.Note.filter({ transaction_id: transaction.id }, "-is_pinned,-created_date"),
    enabled: !!transaction.id,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", transaction.id] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", transaction.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", transaction.id] }),
  });

  const handleAdd = async () => {
    if (!message.trim()) return;
    setAdding(true);
    await createMutation.mutateAsync({
      transaction_id: transaction.id,
      brokerage_id: transaction.brokerage_id,
      title: message.trim().slice(0, 80),
      message: message.trim(),
      note_type: noteType,
      visibility: isAgent ? "agent" : visibility,
      is_pinned: false,
      created_by: currentUser?.email,
      created_by_name: currentUser?.full_name || currentUser?.email,
    });
    setMessage("");
    setAdding(false);
  };

  const handlePin = (note) => updateMutation.mutate({ id: note.id, data: { is_pinned: !note.is_pinned } });
  const handleEdit = (id, data) => updateMutation.mutate({ id, data });
  const handleDelete = (id) => deleteMutation.mutate(id);

  const handleConvertToTask = async (note) => {
    await base44.entities.TransactionTask.create({
      transaction_id: transaction.id,
      brokerage_id: transaction.brokerage_id,
      title: note.message.slice(0, 120),
      phase: 1,
      is_completed: false,
      is_required: false,
      is_custom: true,
      created_by: currentUser?.email,
    });
  };

  const handleSendEmail = (note) => {
    const to = transaction.agent_email || transaction.client_email || "";
    if (!to) return;
    base44.integrations.Core.SendEmail({
      to,
      subject: `Note — ${transaction.address}`,
      body: `<p>${note.message}</p>`,
    });
  };

  // Filter notes by tab
  const visibleNotes = useMemo(() => {
    let list = notes;
    if (isClient) {
      list = notes.filter(n => n.visibility === "client");
    } else if (isAgent) {
      list = notes.filter(n => n.visibility === "agent" || n.visibility === "client");
    } else {
      // TC/admin: tab controls
      if (activeTab === "internal") {
        list = notes.filter(n => n.visibility === "internal");
      } else {
        list = notes.filter(n => n.visibility === "agent" || n.visibility === "client");
      }
    }
    // Pinned first
    return [...list.filter(n => n.is_pinned), ...list.filter(n => !n.is_pinned)];
  }, [notes, activeTab, isClient, isAgent]);

  const canEdit = isTC || isAgent;

  return (
    <div className="flex flex-col h-full rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Notes</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{notes.length} total</span>
      </div>

      {/* Tabs (TC/admin only) */}
      {isTC && (
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          {["internal", "shared"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${activeTab === tab ? "border-b-2 border-blue-500" : ""}`}
              style={{
                color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {tab === "internal" ? "Internal" : "Shared"}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : visibleNotes.length === 0 ? (
          <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>No notes yet.</p>
        ) : (
          visibleNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEdit}
              onPin={handlePin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConvertToTask={handleConvertToTask}
              onSendEmail={handleSendEmail}
            />
          ))
        )}
      </div>

      {/* Add Note input */}
      {!isClient && (
        <div className="border-t flex-shrink-0 p-2.5 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
          <textarea
            className="w-full rounded-md border px-2.5 py-2 text-xs resize-none outline-none transition-colors"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            placeholder="Add a note…"
            rows={2}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
          />
          <div className="flex items-center gap-1.5">
            <select
              className="flex-1 rounded border px-1.5 py-1 text-[11px] outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
            >
              <option value="internal">Internal</option>
              <option value="agent_action">Agent Action</option>
              <option value="client_action">Client Action</option>
              <option value="update">Update</option>
            </select>
            {isTC && (
              <select
                className="flex-1 rounded border px-1.5 py-1 text-[11px] outline-none"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
              >
                <option value="internal">Internal only</option>
                <option value="agent">Share w/ Agent</option>
                <option value="client">Share w/ Client</option>
              </select>
            )}
            <button
              onClick={handleAdd}
              disabled={adding || !message.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>⌘+Enter to submit</p>
        </div>
      )}
    </div>
  );
}