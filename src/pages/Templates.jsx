import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, ChevronDown, ChevronUp, Trash2, CheckCircle, ClipboardList, Clock } from "lucide-react";
import { useCurrentUser, isTCOrAdmin } from "../components/auth/useCurrentUser";
import { DEFAULT_NH_TEMPLATE, DEFAULT_NH_SELLER_TEMPLATE } from "../components/utils/tenantUtils";

export default function Templates() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("buyer");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", currentUser?.brokerage_id],
    queryFn: () => base44.entities.WorkflowTemplate.filter({ brokerage_id: currentUser?.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkflowTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setCreating(false);
      setNewName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkflowTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      // unset all, then set this one
      for (const t of templates) {
        if (t.is_default) await base44.entities.WorkflowTemplate.update(t.id, { is_default: false });
      }
      await base44.entities.WorkflowTemplate.update(templateId, { is_default: true });
      if (currentUser?.brokerage_id) {
        await base44.entities.Brokerage.update(currentUser.brokerage_id, { default_template_id: templateId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const handleCreate = () => {
    if (!newName) return;
    createMutation.mutate({
      brokerage_id: currentUser?.brokerage_id,
      name: newName,
      transaction_type: newType,
      state: "NH",
      version: 1,
      is_default: templates.length === 0,
      ...DEFAULT_NH_TEMPLATE,
      name: newName,
      transaction_type: newType,
    });
  };

  const handleSeedDefault = () => {
    createMutation.mutate({
      ...DEFAULT_NH_TEMPLATE,
      brokerage_id: currentUser?.brokerage_id,
      is_default: templates.length === 0,
    });
  };

  if (!isTCOrAdmin(currentUser)) {
    return <div className="text-center py-20 text-gray-400">Access restricted to TC / Admin users.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workflow Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define tasks, deadlines, and doc checklists per transaction type.</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" onClick={handleSeedDefault} disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Seed NH Default
            </Button>
          )}
          <Button onClick={() => setCreating(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {creating && (
        <Card className="shadow-sm border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <Label className="text-sm">Template Name</Label>
                <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="NH Standard Buyer" />
              </div>
              <div className="w-40">
                <Label className="text-sm">Transaction Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["buyer", "seller", "dual", "lease", "multifamily"].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">Create</Button>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <Card className="shadow-sm border-gray-100">
          <CardContent className="text-center py-14">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No templates yet.</p>
            <p className="text-sm text-gray-400">Click "Seed NH Default" to load a standard NH buyer template.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                        {t.is_default && <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Default</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 capitalize">{t.transaction_type} · {t.state} · v{t.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.is_default && (
                      <Button size="sm" variant="outline" onClick={() => setDefaultMutation.mutate(t.id)} className="text-xs h-7">
                        <CheckCircle className="w-3 h-3 mr-1" /> Set Default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      {expanded === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-400 hover:text-red-600 h-7 w-7"
                      onClick={() => { if (confirm("Delete template?")) deleteMutation.mutate(t.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expanded === t.id && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {/* Tasks */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" /> Tasks ({(t.tasks || []).length})
                      </p>
                      <div className="space-y-1">
                        {(t.tasks || []).map((task) => (
                          <div key={task.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400 flex-shrink-0">
                              {task.phase_number}
                            </span>
                            {task.task_name}
                            {task.required && <span className="text-red-400 ml-auto">*</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Deadlines */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Deadlines ({(t.deadlines || []).length})
                      </p>
                      <div className="space-y-1">
                        {(t.deadlines || []).map((d) => (
                          <div key={d.id} className="text-xs text-gray-600">
                            <span className="capitalize">{d.deadline_type}</span>: +{d.due_offset_days}d from {d.due_anchor?.replace("_", " ")}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Doc Checklist */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Doc Checklist ({(t.doc_checklist || []).length})
                      </p>
                      <div className="space-y-1">
                        {(t.doc_checklist || []).map((d) => (
                          <div key={d.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                            <span className="capitalize">{d.doc_type}</span>
                            {d.required && <span className="text-red-400">*</span>}
                            {d.visible_to_client && <span className="text-blue-400 text-[9px]">client</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}