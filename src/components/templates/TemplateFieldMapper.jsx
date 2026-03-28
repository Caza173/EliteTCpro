import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Info } from "lucide-react";

// NHAR Addendum pre-calibrated defaults (mm on letter page)
const NHAR_DEFAULTS = {
  effective_date:   { x: 130, y: 52,  maxWidth: 60,  fontSize: 10, multiline: false, label: "Effective Date" },
  seller_name:      { x: 14,  y: 60,  maxWidth: 160, fontSize: 10, multiline: false, label: "Seller Name" },
  buyer_name:       { x: 14,  y: 68,  maxWidth: 160, fontSize: 10, multiline: false, label: "Buyer Name" },
  property_address: { x: 40,  y: 76,  maxWidth: 155, fontSize: 10, multiline: false, label: "Property Address" },
  clauses:          { x: 16,  y: 92,  maxWidth: 183, fontSize: 10, multiline: true,  maxHeight: 130, label: "Clauses Body" },
};

const REQUIRED_FIELDS = Object.keys(NHAR_DEFAULTS);

export default function TemplateFieldMapper({ initialFieldMap = {}, onSave, onCancel }) {
  const [fields, setFields] = useState(() => {
    const merged = {};
    REQUIRED_FIELDS.forEach(key => {
      merged[key] = {
        ...NHAR_DEFAULTS[key],
        ...(initialFieldMap[key] || {}),
      };
    });
    return merged;
  });

  const updateField = (key, prop, value) => {
    setFields(prev => ({
      ...prev,
      [key]: { ...prev[key], [prop]: prop === 'multiline' ? value : (parseFloat(value) || value) },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          These coordinates are pre-calibrated for the NHAR Addendum (mm on letter-size page).
          Adjust x/y values if text appears in the wrong position. <strong>Y=0 is top of page.</strong>
        </p>
      </div>

      <div className="space-y-3">
        {REQUIRED_FIELDS.map(key => {
          const f = fields[key];
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono bg-slate-50">{key}</Badge>
                <span className="text-xs text-gray-500">{f.label}</span>
                {f.multiline && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">multiline</Badge>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-gray-400">X (mm)</Label>
                  <Input type="number" className="h-7 text-xs" value={f.x}
                    onChange={e => updateField(key, 'x', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400">Y (mm)</Label>
                  <Input type="number" className="h-7 text-xs" value={f.y}
                    onChange={e => updateField(key, 'y', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400">Max Width (mm)</Label>
                  <Input type="number" className="h-7 text-xs" value={f.maxWidth}
                    onChange={e => updateField(key, 'maxWidth', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400">Font Size</Label>
                  <Input type="number" className="h-7 text-xs" value={f.fontSize}
                    onChange={e => updateField(key, 'fontSize', e.target.value)} />
                </div>
                {f.multiline && (
                  <div>
                    <Label className="text-[10px] text-gray-400">Max Height (mm)</Label>
                    <Input type="number" className="h-7 text-xs" value={f.maxHeight || 130}
                      onChange={e => updateField(key, 'maxHeight', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5"
          onClick={() => onSave(fields)}>
          <CheckCircle className="w-3.5 h-3.5" /> Save Field Map
        </Button>
      </div>
    </div>
  );
}