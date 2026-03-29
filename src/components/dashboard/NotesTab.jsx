import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Share2, CheckCircle2, X, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
};

function NoteCard({ note, onEdit, onComplete, onDelete, isDeleting }) {
  return (
    <div className="theme-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{note.title}</h4>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {note.message.substring(0, 80)}
            {note.message.length > 80 ? "..." : ""}
          </p>
        </div>
        <Badge className={`text-xs whitespace-nowrap flex-shrink-0 border ${STATUS_COLORS[note.status]}`}>
          {STATUS_LABELS[note.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        {note.assigned_to && (
          <div>
            <p style={{ color: "var(--text-muted)" }}>Assigned To</p>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>
              {note.assigned_to.split("@")[0]}
            </p>
          </div>
        )}
        {note.due_date && (
          <div>
            <p style={{ color: "var(--text-muted)" }}>Due Date</p>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>
              {format(new Date(note.due_date), "MMM d")}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(note)} className="text-xs h-7">
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-7" title="Share note">
          <Share2 className="w-3 h-3 mr-1" /> Share
        </Button>
        {note.status !== "completed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(note.id)}
            className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(note.id)}
          disabled={isDeleting === note.id}
          className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
        >
          {isDeleting === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

function AddNoteForm({ transactionId, brokerageId, currentUser, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    message: "",
    assigned_to: "",
    due_date: "",
    status: "open",
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Note.create({
        transaction_id: transactionId,
        brokerage_id: brokerageId,
        title: form.title,
        message: form.message,
        assigned_to: form.assigned_to || currentUser?.email,
        due_date: form.due_date || null,
        status: form.status,
        created_by: currentUser?.email,
      });
      queryClient.invalidateQueries({ queryKey: ["notes", transactionId] });
      onSave();
    } catch (err) {
      console.error("Error creating note:", err);
    }
    setSaving(false);
  };

  return (
    <div className="theme-card p-4 space-y-3 mb-4">
      <input
        type="text"
        placeholder="Note title"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="w-full text-sm font-medium rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
        style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
      />
      <textarea
        placeholder="Note message"
        value={form.message}
        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
        rows={3}
        className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1 resize-none"
        style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="email"
          placeholder="Assign to"
          value={form.assigned_to}
          onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
          className="text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
          style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
        />
        <input
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          className="text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
          style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
        />
        <select
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          className="text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
          style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !form.title.trim() || !form.message.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Note
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function NotesTab({ transactionId, brokerageId, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", transactionId],
    queryFn: () => base44.entities.Note.filter({ transaction_id: transactionId }, "-created_date"),
    enabled: !!transactionId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", transactionId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", transactionId] }),
  });

  const handleComplete = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateMutation.mutate({
        id: noteId,
        data: { status: "completed" },
      });
    }
  };

  const handleDelete = async (noteId) => {
    setDeletingId(noteId);
    await deleteMutation.mutateAsync(noteId);
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setShowForm(!showForm)}
        className="gap-1.5 text-white"
        style={{ background: "var(--accent)" }}
        size="sm"
      >
        <Plus className="w-4 h-4" /> Add Note
      </Button>

      {showForm && (
        <AddNoteForm
          transactionId={transactionId}
          brokerageId={brokerageId}
          currentUser={currentUser}
          onSave={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm">No notes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => {}}
              onComplete={handleComplete}
              onDelete={handleDelete}
              isDeleting={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}