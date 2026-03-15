import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Link2, CheckCircle2, Copy, RefreshCw, FileText,
  AlertTriangle, ExternalLink, Info
} from "lucide-react";
import { useCurrentUser } from "../components/auth/useCurrentUser";

const SUPPORTED_EVENTS = [
  { event: "loop_created", label: "Loop Created", desc: "New loop opened in Dotloop" },
  { event: "document_added", label: "Document Added", desc: "Document uploaded to a loop" },
  { event: "document_signed", label: "Document Signed", desc: "All parties have signed" },
  { event: "document_updated", label: "Document Updated", desc: "Document revised or replaced" },
];

export default function DotloopIntegration() {
  const { data: currentUser } = useCurrentUser();
  const [copied, setCopied] = useState(false);

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["dotloop_audit_logs"],
    queryFn: () => base44.entities.AuditLog.filter({ action: "document_imported" }, "-created_date", 20),
  });

  const dotloopLogs = recentLogs.filter(l =>
    l.actor_email === "dotloop-integration" || l.description?.includes("Dotloop")
  );

  // Build webhook URL — points to the function endpoint
  const appId = window.location.hostname.split(".")[0];
  const webhookUrl = `https://api.base44.com/api/apps/${BASE44_APP_ID || appId}/functions/dotloopWebhook?secret=YOUR_SECRET`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dotloop Integration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatically receive documents from Dotloop into EliteTC
          </p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Webhook Ready
        </Badge>
      </div>

      {/* Setup Instructions */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-500" /> Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Required:</strong> Set <code className="bg-amber-100 px-1 rounded">DOTLOOP_WEBHOOK_SECRET</code> in your app secrets (Dashboard → Settings → Environment Variables). Use the same value in the URL below.
              Optionally set <code className="bg-amber-100 px-1 rounded">DOTLOOP_API_KEY</code> to enable full document downloads from the Dotloop API.
            </div>
          </div>

          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <p className="font-medium">Log in to Dotloop Admin</p>
                <p className="text-gray-500 mt-0.5">
                  Go to <a href="https://dotloop.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">dotloop.com <ExternalLink className="w-3 h-3" /></a> → Admin → API & Webhooks
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <p className="font-medium">Create a new webhook subscription</p>
                <p className="text-gray-500 mt-0.5">Paste the endpoint URL below as the webhook destination.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div>
                <p className="font-medium mb-2">Your Webhook Endpoint</p>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs break-all">
                  <span className="flex-1 text-gray-700">{webhookUrl}</span>
                  <Button variant="ghost" size="sm" className="flex-shrink-0 h-7 px-2" onClick={copyUrl}>
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-1">Replace <code>YOUR_SECRET</code> with the value you set in DOTLOOP_WEBHOOK_SECRET.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
              <div>
                <p className="font-medium">Subscribe to these events</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {SUPPORTED_EVENTS.map(e => (
                    <div key={e.event} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{e.event}</p>
                        <p className="text-xs text-gray-500">{e.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", label: "Dotloop Event", desc: "A document is added or signed in Dotloop" },
              { step: "2", label: "Webhook Fires", desc: "EliteTC receives the event and downloads the document" },
              { step: "3", label: "Transaction Match", desc: "Matches by MLS#, address, or participant email" },
              { step: "4", label: "AI Processing", desc: "Document is parsed, classified, and attached to the transaction" },
            ].map(item => (
              <div key={item.step} className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">{item.step}</div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Matching Logic */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" /> Transaction Matching Logic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <span className="font-bold text-blue-600 w-4">1</span>
            <div><strong>MLS Number</strong> — matches <code className="bg-gray-200 px-1 rounded text-xs">mls_number</code> field on transaction</div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <span className="font-bold text-blue-600 w-4">2</span>
            <div><strong>Property Address</strong> — fuzzy matches loop name against transaction addresses</div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <span className="font-bold text-blue-600 w-4">3</span>
            <div><strong>Participant Email</strong> — matches loop participant emails against client/agent email fields</div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>If no match is found, a <strong>pending transaction</strong> is created automatically and flagged for manual review.</div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> Recent Dotloop Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dotloopLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No documents imported yet. Configure the webhook above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dotloopLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.created_date ? new Date(log.created_date).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                  {log.transaction_id && (
                    <a href={`#/TransactionDetail?id=${log.transaction_id}`}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap ml-4">
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}