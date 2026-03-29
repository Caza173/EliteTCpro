import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Info, Move, Eye, Settings, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Letter page in mm
const PAGE_W_MM = 215.9;
const PAGE_H_MM = 279.4;

const REQUIRED_FIELDS = [
  { key: "effective_date",   label: "Effective Date",    multiline: false, color: "#3B82F6" },
  { key: "seller_name",      label: "Seller Name",       multiline: false, color: "#10B981" },
  { key: "buyer_name",       label: "Buyer Name",        multiline: false, color: "#F59E0B" },
  { key: "property_address", label: "Property Address",  multiline: false, color: "#8B5CF6" },
  { key: "clauses",          label: "Clauses Body",      multiline: true,  color: "#EF4444" },
];

const DEFAULT_FIELDS = {
  effective_date:   { x: 130, y: 52,  maxWidth: 60,  fontSize: 10, multiline: false },
  seller_name:      { x: 14,  y: 60,  maxWidth: 160, fontSize: 10, multiline: false },
  buyer_name:       { x: 14,  y: 68,  maxWidth: 160, fontSize: 10, multiline: false },
  property_address: { x: 40,  y: 76,  maxWidth: 155, fontSize: 10, multiline: false },
  clauses:          { x: 16,  y: 92,  maxWidth: 183, fontSize: 10, multiline: true, maxHeight: 130 },
};

const SAMPLE_DATA = {
  effective_date:   "03/15/2026",
  seller_name:      "Jonathan & Margaret Worthington-Ellis",
  buyer_name:       "Christopher A. Martinez & Diana L. Chen-Martinez",
  property_address: "42 Whispering Pines Drive, Hillsborough, NH 03244",
  clauses:          "1. Inspection Contingency\nThe Buyer's obligation to purchase the Property is contingent upon a satisfactory home inspection completed within 10 days of the Effective Date. If unsatisfactory, Buyer may terminate with full refund of earnest money.\n\n2. Financing Contingency\nThis Agreement is contingent upon Buyer obtaining a firm written mortgage commitment for a 30-year fixed rate loan at or below 7.5% APR within 21 days of the Effective Date.",
};

// mm → px given a displayed pixel width for the page
function mmToPx(mm, pageWidthPx) {
  return (mm / PAGE_W_MM) * pageWidthPx;
}
function pxToMm(px, pageWidthPx) {
  return (px / pageWidthPx) * PAGE_W_MM;
}

export default function TemplateFieldMapper({ initialFieldMap = {}, templateFileUrl = null, onSave, onCancel }) {
  const [fields, setFields] = useState(() => {
    const merged = {};
    REQUIRED_FIELDS.forEach(({ key, multiline }) => {
      merged[key] = {
        ...DEFAULT_FIELDS[key],
        multiline,
        ...(initialFieldMap[key] || {}),
      };
    });
    return merged;
  });

  const [offsetX, setOffsetX] = useState(initialFieldMap._offset_x ?? 0);
  const [offsetY, setOffsetY] = useState(initialFieldMap._offset_y ?? 0);
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "numeric"
  const [dragging, setDragging] = useState(null); // { key, startX, startY, origX, origY }
  const [resizing, setResizing] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pageWidthPx, setPageWidthPx] = useState(600);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Measure container width for scaling
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setPageWidthPx(containerRef.current.clientWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const pageHeightPx = (PAGE_H_MM / PAGE_W_MM) * pageWidthPx;

  // Mouse drag handlers
  const onMouseDownField = useCallback((e, key) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    setDragging({
      key,
      startMouseX: e.clientX - rect.left,
      startMouseY: e.clientY - rect.top,
      origX: fields[key].x,
      origY: fields[key].y,
    });
  }, [fields]);

  const onMouseMove = useCallback((e) => {
    if (!dragging && !resizing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (dragging) {
      const dx = pxToMm(mouseX - dragging.startMouseX, pageWidthPx);
      const dy = pxToMm(mouseY - dragging.startMouseY, pageWidthPx);
      const newX = Math.max(0, Math.min(PAGE_W_MM - 10, dragging.origX + dx));
      const newY = Math.max(0, Math.min(PAGE_H_MM - 5, dragging.origY + dy));
      setFields(prev => ({
        ...prev,
        [dragging.key]: { ...prev[dragging.key], x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 },
      }));
    }

    if (resizing) {
      const dx = pxToMm(mouseX - resizing.startMouseX, pageWidthPx);
      const newWidth = Math.max(10, Math.min(PAGE_W_MM - resizing.origX, resizing.origWidth + dx));
      setFields(prev => ({
        ...prev,
        [resizing.key]: { ...prev[resizing.key], maxWidth: Math.round(newWidth * 10) / 10 },
      }));
    }
  }, [dragging, resizing, pageWidthPx]);

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const onMouseDownResize = useCallback((e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setResizing({
      key,
      startMouseX: e.clientX - rect.left,
      origWidth: fields[key].maxWidth,
      origX: fields[key].x,
    });
  }, [fields]);

  const updateField = (key, prop, raw) => {
    const value = prop === "multiline" ? raw : (parseFloat(raw) || 0);
    setFields(prev => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
  };

  const handleTestRender = async () => {
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const finalFields = buildFinalFields();
      const res = await base44.functions.invoke("previewFieldMap", {
        field_map: finalFields,
        sample_data: SAMPLE_DATA,
        template_file_url: templateFileUrl || null,
        offset_x: offsetX,
        offset_y: offsetY,
      });
      if (res.data?.file_url) {
        setPreviewUrl(res.data.file_url);
      }
    } catch (err) {
      console.error("Preview failed", err);
    }
    setPreviewLoading(false);
  };

  const buildFinalFields = () => {
    const out = {};
    REQUIRED_FIELDS.forEach(({ key }) => {
      out[key] = { ...fields[key] };
    });
    out._offset_x = offsetX;
    out._offset_y = offsetY;
    return out;
  };

  const handleSave = () => {
    onSave(buildFinalFields());
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("visual")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "visual" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Move className="w-3 h-3 inline mr-1" /> Visual Mapper
        </button>
        <button
          onClick={() => setActiveTab("numeric")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "numeric" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Settings className="w-3 h-3 inline mr-1" /> Numeric Edit
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          {activeTab === "visual"
            ? "Drag field boxes onto their target positions on the PDF. Drag the right edge to resize width. Y=0 is top of page."
            : "Fine-tune coordinates numerically. Use Global Offset to shift all fields uniformly if the whole layout is off."}
        </p>
      </div>

      {/* ── VISUAL TAB ── */}
      {activeTab === "visual" && (
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {REQUIRED_FIELDS.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1 text-xs px-2 py-1 rounded border" style={{ borderColor: color, color }}>
                <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* PDF Page Canvas */}
          <div
            className="relative border-2 border-gray-300 rounded overflow-hidden bg-white select-none"
            style={{ width: "100%", paddingBottom: `${(PAGE_H_MM / PAGE_W_MM) * 100}%`, position: "relative" }}
            ref={containerRef}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div style={{ position: "absolute", inset: 0 }}>
              {/* PDF background */}
              {templateFileUrl ? (
                <iframe
                  ref={iframeRef}
                  src={`${templateFileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full pointer-events-none border-none"
                  onLoad={() => setPdfLoaded(true)}
                  title="PDF Template"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-300 text-4xl mb-2">📄</div>
                    <p className="text-xs text-gray-400">No PDF uploaded — drag fields to set positions</p>
                  </div>
                </div>
              )}

              {/* Draggable field overlays */}
              {REQUIRED_FIELDS.map(({ key, label, color, multiline }) => {
                const f = fields[key];
                const left = mmToPx(f.x + offsetX, pageWidthPx);
                const top = mmToPx(f.y + offsetY, pageWidthPx);
                const width = mmToPx(f.maxWidth, pageWidthPx);
                const height = multiline
                  ? mmToPx(f.maxHeight || 30, pageWidthPx)
                  : mmToPx(f.fontSize * 0.4 + 2, pageWidthPx);
                const isDraggingThis = dragging?.key === key;

                return (
                  <div
                    key={key}
                    onMouseDown={(e) => onMouseDownField(e, key)}
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width,
                      height: Math.max(height, 16),
                      border: `2px solid ${color}`,
                      background: `${color}22`,
                      cursor: isDraggingThis ? "grabbing" : "grab",
                      boxSizing: "border-box",
                      borderRadius: 3,
                      zIndex: isDraggingThis ? 20 : 10,
                      display: "flex",
                      alignItems: "flex-start",
                      overflow: "hidden",
                    }}
                  >
                    {/* Label pill */}
                    <div
                      style={{
                        background: color,
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "1px 4px",
                        borderRadius: "2px 0 2px 0",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        lineHeight: "14px",
                      }}
                    >
                      {label}
                    </div>
                    {/* Coords display */}
                    <div style={{ fontSize: 8, color, padding: "2px 3px", lineHeight: "12px", opacity: 0.9 }}>
                      ({f.x},{f.y})
                    </div>
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => onMouseDownResize(e, key)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: "ew-resize",
                        background: `${color}66`,
                        borderLeft: `1px solid ${color}`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Numeric readout below visual */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REQUIRED_FIELDS.map(({ key, label, color }) => {
              const f = fields[key];
              return (
                <div key={key} className="rounded border p-2 text-xs" style={{ borderColor: color + "66" }}>
                  <div className="font-semibold mb-1" style={{ color }}>{label}</div>
                  <div className="text-gray-500">X: <span className="text-gray-800 font-mono">{f.x}mm</span></div>
                  <div className="text-gray-500">Y: <span className="text-gray-800 font-mono">{f.y}mm</span></div>
                  <div className="text-gray-500">W: <span className="text-gray-800 font-mono">{f.maxWidth}mm</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NUMERIC TAB ── */}
      {activeTab === "numeric" && (
        <div className="space-y-3">
          {/* Global offset */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700 mb-2">Global Offset (shifts ALL fields uniformly)</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-[10px] text-gray-500">Offset X (mm)</Label>
                <Input type="number" className="h-7 text-xs" value={offsetX}
                  onChange={e => setOffsetX(parseFloat(e.target.value) || 0)} step="0.5" />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-gray-500">Offset Y (mm)</Label>
                <Input type="number" className="h-7 text-xs" value={offsetY}
                  onChange={e => setOffsetY(parseFloat(e.target.value) || 0)} step="0.5" />
              </div>
            </div>
          </div>

          {REQUIRED_FIELDS.map(({ key, label, multiline, color }) => {
            const f = fields[key];
            return (
              <div key={key} className="rounded-lg border p-3" style={{ borderColor: color + "55" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <Badge variant="outline" className="text-xs font-mono bg-slate-50">{key}</Badge>
                  <span className="text-xs text-gray-500">{label}</span>
                  {multiline && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">multiline</Badge>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">X (mm)</Label>
                    <Input type="number" className="h-7 text-xs" value={f.x}
                      onChange={e => updateField(key, 'x', e.target.value)} step="0.5" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Y (mm)</Label>
                    <Input type="number" className="h-7 text-xs" value={f.y}
                      onChange={e => updateField(key, 'y', e.target.value)} step="0.5" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Max Width (mm)</Label>
                    <Input type="number" className="h-7 text-xs" value={f.maxWidth}
                      onChange={e => updateField(key, 'maxWidth', e.target.value)} step="0.5" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Font Size (pt)</Label>
                    <Input type="number" className="h-7 text-xs" value={f.fontSize}
                      onChange={e => updateField(key, 'fontSize', e.target.value)} />
                  </div>
                  {multiline && (
                    <div>
                      <Label className="text-[10px] text-gray-400">Max Height (mm)</Label>
                      <Input type="number" className="h-7 text-xs" value={f.maxHeight || 130}
                        onChange={e => updateField(key, 'maxHeight', e.target.value)} step="0.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Panel */}
      {previewUrl && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Test Render Preview</span>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline">Open PDF ↗</a>
          </div>
          <iframe src={`${previewUrl}#toolbar=0`} className="w-full" style={{ height: 400 }} title="Preview" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          onClick={handleTestRender}
          disabled={previewLoading}
        >
          {previewLoading
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rendering...</>
            : <><Eye className="w-3.5 h-3.5" /> Preview Filled PDF</>}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={handleSave}>
            <CheckCircle className="w-3.5 h-3.5" /> Save Field Map
          </Button>
        </div>
      </div>
    </div>
  );
}