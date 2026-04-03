import React from "react";
import { AlertTriangle, XCircle } from "lucide-react";

export default function CommIssueList({ issues = [] }) {
  if (!issues.length) return null;
  return (
    <div className="space-y-2 mt-3">
      {issues.map((issue, i) => {
        const isBlock = issue.severity === "blocking";
        return (
          <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${
            isBlock ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            {isBlock
              ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-snug">{issue.message || issue.label}</p>
              {issue.section && (
                <p className="text-xs mt-0.5 opacity-75">Source: {issue.section}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}