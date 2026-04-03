import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Plus, FileText, Trash2, Edit2, CheckCircle2, ChevronDown, ChevronRight, Loader2, Star, StarOff, Layers } from "lucide-react";
import { toast } from "sonner";
import TemplateUploadModal from "@/components/templates/TemplateUploadModal";
import TemplateEditorPanel from "@/components/templates/TemplateEditorPanel";

const TYPE_COLORS = {
  buyer:       "bg-blue-100 text-blue-700",
  seller:      "bg-emerald-100 text-emerald-700",
  land:        "bg-amber-100 text-amber-700",
  commercial:  "bg-purple-100 text-purple-700",
  multifamily: "bg-indigo-100 text-indigo-700",
  dual:        "bg-pink-100 text-pink-700",
  lease:       "bg-teal-100 text-teal-700",
};

export default function TemplateManager() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["workflowTemplates", currentUser?.brokerage_id],
    queryFn: () => base44.entities.WorkflowTemplate.filter({ brokerage_id: currentUser.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowTemplates"] });
      toast.success("Template deleted");
    },
  });

  const toggleDefaultMutation = useMutation({
    mutationFn: async ({ id, transaction_type, currently_default }) => {
      // Unset existing default for that type
      if (!currently_default) {
        const existing = templates.filter(t => t.transaction_type === transaction_type && t.is_default && t.id !== id);
        await Promise.all(existing.map(t => base44.entities.WorkflowTemplate.update(t.id, { is_default: false })));
      }
      return base44.entities.WorkflowTemplate.update(id, { is_default: !currently_default });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflowTemplates"] }),
  });

  const grouped = templates.reduce((acc, t) => {
    const type = t.transaction_type || "buyer";
    if (!acc[type]) acc[type] = [];
    acc[type].push(t);
    return acc;
  }, {});

  if (editingTemplate) {
    return (
      <TemplateEditorPanel
        template={editingTemplate}
        onSave={(updated) => {
          queryClient.invalidateQueries({ queryKey: ["workflowTemplates"] });
          setEditingTemplate(null);
          toast.success("Template saved");
        }}
        onCancel={() => setEditingTemplate(null)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Transaction Templates</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Upload, parse, and manage workflow templates for any transaction type.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" /> Upload Template
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setEditingTemplate({
            brokerage_id: currentUser?.brokerage_id,
            name: "",
            transaction_type: "buyer",
            phases: [],
            tasks: [],
            deadlines: [],
            doc_checklist: [],
            compliance_rules: [],
            source: "manual",
          })}>
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>
      </div>

      {/* Template groups */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <div className="theme-card p-16 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No templates yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a document or create a template from scratch.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" /> Upload Template
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, items]) => (
            <TemplateGroup
              key={type}
              type={type}
              items={items}
              onEdit={setEditingTemplate}
              onDelete={(id) => deleteMutation.mutate(id)}
              onToggleDefault={(id, currently_default) =>
                toggleDefaultMutation.mutate({ id, transaction_type: type, currently_default })}
            />
          ))}
        </div>
      )}

      <TemplateUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        brokerageId={currentUser?.brokerage_id}
        onSaved={(tpl) => {
          queryClient.invalidateQueries({ queryKey: ["workflowTemplates"] });
          setUploadOpen(false);
          setEditingTemplate(tpl);
          toast.success("Template parsed — review and save below.");
        }}
      />
    </div>
  );
}

function TemplateGroup({ type, items, onEdit, onDelete, onToggleDefault }) {
  const [expanded, setExpanded] = useState(true);
  const color = TYPE_COLORS[type] || "bg-gray-100 text-gray-600";

  return (
    <div className="theme-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 border-b text-left"
        style={{ borderColor: "var(--card-border)" }}
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${color}`}>{type}</span>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{items.length} template{items.length !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronDown className="w-4 h-4 ml-auto" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--text-muted)" }} />}
      </button>
      {expanded && (
        <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {items.map(tpl => (
            <TemplateRow key={tpl.id} tpl={tpl} onEdit={onEdit} onDelete={onDelete} onToggleDefault={onToggleDefault} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateRow({ tpl, onEdit, onDelete, onToggleDefault }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tpl.name}</span>
          {tpl.is_default && <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-200">Default</Badge>}
          {tpl.source === "uploaded" && <Badge className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">Uploaded</Badge>}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {(tpl.phases || []).length} phases · {(tpl.tasks || []).length} tasks · {(tpl.doc_checklist || []).length} docs
        </p>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleDefault(tpl.id, tpl.is_default)}
          className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors"
          title={tpl.is_default ? "Remove default" : "Set as default"}
        >
          {tpl.is_default
            ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            : <StarOff className="w-4 h-4 text-gray-400" />}
        </button>
        <button onClick={() => onEdit(tpl)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
          <Edit2 className="w-4 h-4 text-blue-500" />
        </button>
        <button onClick={() => onDelete(tpl.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}