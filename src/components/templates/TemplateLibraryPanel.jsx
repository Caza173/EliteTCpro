import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText, Upload, Settings2, Trash2, CheckCircle, Loader2, Eye, Map
} from "lucide-react";
import TemplateFieldMapper from "./TemplateFieldMapper";
import { toast } from "sonner";

export default function TemplateLibraryPanel() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("addendum");
  const [mappingTemplate, setMappingTemplate] = useState(null); // template being mapped

  const brokerageId = currentUser?.brokerage_id;

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["pdfTemplates", brokerageId],
    queryFn: () => base44.entities.PDFTemplate.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PDFTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pdfTemplates"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PDFTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfTemplates"] });
      setMappingTemplate(null);
      toast.success("Field map saved!");
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newName.trim()) { toast.error("Please enter a template name first"); return; }

    // Check for duplicate type
    const dup = templates.find(t => t.type === newType);
    if (dup) {
      toast.error(`A template of type "${newType}" already exists: "${dup.name}". Delete it first.`);
      return;
    }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const created = await base44.entities.PDFTemplate.create({
      brokerage_id: brokerageId,
      name: newName.trim(),
      type: newType,
      file_url,
      file_name: file.name,
      field_map: {},
      is_mapped: false,
      created_by: currentUser?.email,
    });
    setUploading(false);
    setNewName("");
    queryClient.invalidateQueries({ queryKey: ["pdfTemplates"] });
    toast.success("Template uploaded! Now map the fields.");
    // Auto-open mapper
    setMappingTemplate(created);
    e.target.value = "";
  };

  const handleSaveFieldMap = (templateId, fieldMap) => {
    updateMutation.mutate({ id: templateId, data: { field_map: fieldMap, is_mapped: true } });
  };

  const typeColors = {
    addendum: "bg-blue-50 text-blue-700 border-blue-200",
    disclosure: "bg-amber-50 text-amber-700 border-amber-200",
    agreement: "bg-purple-50 text-purple-700 border-purple-200",
    other: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className="space-y-6">
      {/* Upload new template */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" /> Upload PDF Template
          </CardTitle>
          <p className="text-xs text-gray-400">Upload once. Reuse across all transactions.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Template name (e.g. NHAR Addendum)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addendum">Addendum</SelectItem>
                <SelectItem value="disclosure">Disclosure</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !newName.trim()}
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Choose PDF"}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          </div>
        </CardContent>
      </Card>

      {/* Template list */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading templates...</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-gray-200">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No templates yet. Upload your first PDF above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <Card key={tmpl.id} className="shadow-sm border-gray-100">
              <CardContent className="p-4">
                {mappingTemplate?.id === tmpl.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Map className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold text-gray-800">Map Fields — {tmpl.name}</span>
                    </div>
                    <TemplateFieldMapper
                      initialFieldMap={tmpl.field_map || {}}
                      onSave={(fieldMap) => handleSaveFieldMap(tmpl.id, fieldMap)}
                      onCancel={() => setMappingTemplate(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{tmpl.name}</p>
                        <Badge variant="outline" className={`text-[10px] capitalize ${typeColors[tmpl.type] || typeColors.other}`}>
                          {tmpl.type}
                        </Badge>
                        {tmpl.is_mapped
                          ? <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle className="w-2.5 h-2.5 mr-1" />Fields Mapped
                            </Badge>
                          : <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Needs Mapping
                            </Badge>
                        }
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{tmpl.file_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a href={tmpl.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View PDF">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setMappingTemplate(tmpl)}>
                        <Settings2 className="w-3.5 h-3.5" /> Map Fields
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(tmpl.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}