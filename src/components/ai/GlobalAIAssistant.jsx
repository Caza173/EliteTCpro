import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { format, isThisWeek, isThisMonth, addDays } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const QUICK_PROMPTS = [
  "Daily briefing",
  "What deadlines are this week?",
  "Which deals have compliance issues?",
  "Which transactions are missing documents?",
  "Deals closing this month",
  "Which deals are at risk?",
];

function buildGlobalSystemPrompt(transactions, documents, checklistItems, complianceReports) {
  const today = new Date();
  const active = transactions.filter((t) => t.status === "active");
  const pending = transactions.filter((t) => t.status === "pending");
  const closed = transactions.filter((t) => t.status === "closed");

  const DEADLINE_FIELDS = [
    { key: "inspection_deadline", label: "Inspection" },
    { key: "earnest_money_deadline", label: "Earnest Money" },
    { key: "appraisal_deadline", label: "Appraisal" },
    { key: "financing_deadline", label: "Financing Commitment" },
    { key: "due_diligence_deadline", label: "Due Diligence" },
    { key: "closing_date", label: "Closing" },
  ];

  // All upcoming deadlines
  const allDeadlines = [];
  transactions.forEach((tx) => {
    DEADLINE_FIELDS.forEach(({ key, label }) => {
      if (tx[key]) {
        const dt = new Date(tx[key]);
        const daysLeft = Math.ceil((dt - today) / (1000 * 60 * 60 * 24));
        allDeadlines.push({ address: tx.address, label, date: tx[key], daysLeft, txId: tx.id });
      }
    });
  });
  allDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);
  const upcomingDeadlines = allDeadlines.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 14);
  const overdueDeadlines = allDeadlines.filter((d) => d.daysLeft < 0);

  const deadlinesText = upcomingDeadlines.slice(0, 20)
    .map((d) => `  - ${d.label} | ${d.address} | ${format(new Date(d.date), "MMM d")} (${d.daysLeft === 0 ? "TODAY" : `${d.daysLeft}d`})`)
    .join("\n") || "  None in next 14 days";

  const overdueText = overdueDeadlines.slice(0, 10)
    .map((d) => `  - ${d.label} | ${d.address} | ${format(new Date(d.date), "MMM d")} (${Math.abs(d.daysLeft)}d overdue)`)
    .join("\n") || "  None";

  // Missing docs per transaction
  const missingByTx = {};
  checklistItems.filter((ci) => ci.status === "missing").forEach((ci) => {
    if (!missingByTx[ci.transaction_id]) missingByTx[ci.transaction_id] = [];
    missingByTx[ci.transaction_id].push(ci.label || ci.doc_type);
  });

  const missingDocsText = Object.entries(missingByTx).slice(0, 15)
    .map(([txId, docs]) => {
      const tx = transactions.find((t) => t.id === txId);
      return `  - ${tx?.address || txId}: ${docs.join(", ")}`;
    })
    .join("\n") || "  None";

  // Compliance issues
  const complianceByTx = {};
  complianceReports.forEach((r) => {
    const issues = [...(r.blockers || []), ...(r.warnings || [])];
    if (issues.length > 0) {
      complianceByTx[r.transaction_id] = issues.map((i) => i.message || i.field || "Issue detected");
    }
  });
  const complianceText = Object.entries(complianceByTx).slice(0, 15)
    .map(([txId, issues]) => {
      const tx = transactions.find((t) => t.id === txId);
      return `  - ${tx?.address || txId}: ${issues.slice(0, 3).join("; ")}`;
    })
    .join("\n") || "  No issues detected";

  // Transactions list
  const txList = transactions.slice(0, 50).map((tx) => {
    const buyers = tx.buyers?.length ? tx.buyers.join(", ") : (tx.buyer || "Unknown");
    const sellers = tx.sellers?.length ? tx.sellers.join(", ") : (tx.seller || "Unknown");
    const closingDaysLeft = tx.closing_date ? Math.ceil((new Date(tx.closing_date) - today) / (1000 * 60 * 60 * 24)) : null;
    return `  - ${tx.address} | ${tx.status} | Buyer: ${buyers} | Seller: ${sellers} | Agent: ${tx.agent || "N/A"} | Phase: ${tx.phase || 1}/12 | Closing: ${tx.closing_date ? format(new Date(tx.closing_date), "MMM d") + (closingDaysLeft !== null ? ` (${closingDaysLeft}d)` : "") : "N/A"} | Sale: ${tx.sale_price ? "$" + tx.sale_price.toLocaleString() : "N/A"}`;
  }).join("\n");

  return `You are an expert AI Transaction Coordinator Assistant with full visibility into a real estate transaction management platform called EliteTC. You have access to all transactions, deadlines, documents, and compliance data.

Today's date: ${format(today, "MMMM d, yyyy")}

=== PORTFOLIO OVERVIEW ===
Total Transactions: ${transactions.length}
Active: ${active.length}
Pending: ${pending.length}
Closed: ${closed.length}

=== ALL TRANSACTIONS ===
${txList || "  No transactions found."}

=== UPCOMING DEADLINES (next 14 days) ===
${deadlinesText}

=== OVERDUE DEADLINES ===
${overdueText}

=== MISSING DOCUMENTS BY TRANSACTION ===
${missingDocsText}

=== COMPLIANCE ISSUES ===
${complianceText}

=== DOCUMENT COUNTS ===
Total Documents Uploaded: ${documents.length}
Total Checklist Items: ${checklistItems.length}
Missing: ${checklistItems.filter((ci) => ci.status === "missing").length}
Approved: ${checklistItems.filter((ci) => ci.status === "approved").length}
Pending Approval: ${checklistItems.filter((ci) => ci.status === "uploaded").length}

=== YOUR CAPABILITIES ===
- Answer portfolio-level questions about all transactions
- Provide a daily briefing of the pipeline
- Identify which deals are at risk or have issues
- List upcoming and overdue deadlines
- Show which transactions are missing documents
- Identify compliance flags across all deals
- Summarize any specific transaction
- Draft communications for any deal
- Provide actionable next steps for the pipeline

When asked about specific transactions, reference the actual address, parties, and data above. Format responses clearly with sections and bullet points. Be concise and actionable. If the user asks for a "daily briefing," provide a structured summary covering: deals closing soon, upcoming deadlines, compliance alerts, and missing documents.`;
}

function FormattedMessage({ content }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        if (line.startsWith("### ")) return <p key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</p>;
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</p>;
        if (line.startsWith("# ")) return <p key={i} className="font-bold text-lg mt-2 mb-1">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={i} className="flex gap-1.5 text-sm"><span className="text-gray-400 flex-shrink-0">•</span><span>{rendered.slice(1)}</span></div>;
        }
        if (line.startsWith("---")) return <hr key={i} className="my-2 opacity-20" />;
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <div key={i} className="text-sm">{rendered}</div>;
      })}
    </div>
  );
}

export default function GlobalAIAssistant({ transactions = [], checklistItems = [] }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello! I'm your AI Transaction Command Center. I have full visibility into **${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}** in your pipeline.\n\nAsk me anything — upcoming deadlines, compliance issues, deal summaries, drafting emails — or click a quick prompt below to get started.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["allDocuments"],
    queryFn: () => base44.entities.Document.list(),
    staleTime: 60_000,
  });

  const { data: complianceReports = [] } = useQuery({
    queryKey: ["allCompliance"],
    queryFn: () => base44.entities.ComplianceReport.list(),
    staleTime: 60_000,
  });

  // Update welcome message when transaction count changes
  useEffect(() => {
    if (transactions.length > 0 && messages.length === 1) {
      setMessages([{
        role: "assistant",
        content: `Hello! I'm your AI Transaction Command Center. I have full visibility into **${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}** in your pipeline.\n\nAsk me anything — upcoming deadlines, compliance issues, deal summaries, drafting emails — or click a quick prompt below to get started.`,
      }]);
    }
  }, [transactions.length]);

  useEffect(() => {
    if (expanded && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading, expanded]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    setExpanded(true);

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    const systemPrompt = buildGlobalSystemPrompt(transactions, documents, checklistItems, complianceReports);
    const conversationHistory = newMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${systemPrompt}\n\n=== CONVERSATION ===\n${conversationHistory}\n\nRespond to the user's latest message. Be helpful, professional, and reference specific transaction data when relevant.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: `Chat cleared. I still have full visibility into **${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}**. What do you need?`,
    }]);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Transaction Command Center</p>
            <p className="text-xs text-blue-200">{transactions.length} transactions · Portfolio-level intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white border-white/20 text-xs">Live Data</Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
        </div>
      </div>

      {expanded && (
        <>
          {/* Quick prompts */}
          <div className="px-4 py-2.5 border-b flex gap-2 overflow-x-auto flex-wrap" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === "user" ? "bg-blue-600" : "bg-slate-700"}`}>
                  {msg.role === "user"
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-blue-600 text-white text-sm" : ""}`}
                  style={msg.role !== "user" ? { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--card-border)" } : {}}
                >
                  {msg.role === "user"
                    ? <p className="text-sm">{msg.content}</p>
                    : <FormattedMessage content={msg.content} />
                  }
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Analyzing pipeline...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Ask about your pipeline, deadlines, compliance, draft emails..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none text-sm flex-1"
                disabled={loading}
              />
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={clearChat} className="h-9 w-9 p-0" title="Clear chat">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      )}
    </div>
  );
}