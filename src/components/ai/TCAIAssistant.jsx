import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, User, Loader2, Globe, RefreshCw } from "lucide-react";
import { format } from "date-fns";

function buildSystemPrompt(transaction, documents, checklistItems, complianceReports, complianceIssuesList = []) {
  const buyers = transaction.buyers?.length ? transaction.buyers.join(", ") : (transaction.buyer || "Unknown");
  const sellers = transaction.sellers?.length ? transaction.sellers.join(", ") : (transaction.seller || "Unknown");

  const deadlines = [
    { label: "Earnest Money Deposit", date: transaction.earnest_money_deadline },
    { label: "Inspection Deadline", date: transaction.inspection_deadline },
    { label: "Due Diligence Deadline", date: transaction.due_diligence_deadline },
    { label: "Appraisal Deadline", date: transaction.appraisal_deadline },
    { label: "Financing Commitment", date: transaction.financing_deadline },
    { label: "Closing Date", date: transaction.closing_date },
  ].filter((d) => d.date);

  const today = new Date();
  const upcomingDeadlines = deadlines
    .map((d) => {
      const dt = new Date(d.date);
      const daysLeft = Math.ceil((dt - today) / (1000 * 60 * 60 * 24));
      return `  - ${d.label}: ${format(dt, "MMM d, yyyy")} (${daysLeft > 0 ? `${daysLeft} days away` : daysLeft === 0 ? "TODAY" : `${Math.abs(daysLeft)} days OVERDUE`})`;
    })
    .join("\n");

  const PHASES = [
    "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
    "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
    "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
  ];

  const tasks = (transaction.tasks || []);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const docList = documents.length > 0
    ? documents.map((d) => `  - ${d.file_name || d.doc_type} (${d.doc_type}, uploaded ${d.created_date ? format(new Date(d.created_date), "MMM d") : "unknown date"})`).join("\n")
    : "  No documents uploaded yet.";

  const missingDocs = checklistItems.filter((i) => i.status === "missing").map((i) => `  - ${i.label || i.doc_type}`).join("\n") || "  None identified.";
  const approvedDocs = checklistItems.filter((i) => i.status === "approved").length;
  const totalDocs = checklistItems.length;

  // Merge ComplianceReport issues + ComplianceIssue records
  const reportIssues = complianceReports.flatMap((r) => [
    ...(r.blockers || []).map((b) => `  [BLOCKER] ${b.message || b.field || JSON.stringify(b)}`),
    ...(r.warnings || []).map((w) => `  [WARNING] ${w.message || w.field || JSON.stringify(w)}`),
  ]);
  const trackedIssues = (complianceIssuesList || [])
    .filter(i => i.status === "open")
    .map(i => `  [${i.severity.toUpperCase()}][${i.issue_type}] ${i.message}`);
  const allIssueLines = [...new Set([...reportIssues, ...trackedIssues])];
  const complianceIssues = allIssueLines.join("\n") || "  No compliance issues detected.";

  return `You are an expert AI Transaction Coordinator Assistant for a real estate transaction management platform called EliteTC. You have deep knowledge of real estate transactions, contracts, timelines, and compliance requirements.

You are currently assisting with the following transaction:

=== TRANSACTION DETAILS ===
Property: ${transaction.address}
Status: ${transaction.status || "active"}
Type: ${transaction.transaction_type || "buyer"}
Phase: ${PHASES[(transaction.phase || 1) - 1]} (Phase ${transaction.phase || 1} of 12)
Cash Transaction: ${transaction.is_cash_transaction ? "Yes" : "No"}
MLS #: ${transaction.mls_number || "N/A"}

=== PARTIES ===
Buyer(s): ${buyers}
Seller(s): ${sellers}
Buyer's Agent: ${transaction.buyers_agent_name || "Unknown"} | Email: ${transaction.buyers_agent_email || "N/A"} | Phone: ${transaction.buyers_agent_phone || "N/A"}
Buyer's Brokerage: ${transaction.buyer_brokerage || "Unknown"}
Seller's Agent: ${transaction.sellers_agent_name || "Unknown"} | Email: ${transaction.sellers_agent_email || "N/A"} | Phone: ${transaction.sellers_agent_phone || "N/A"}
Seller's Brokerage: ${transaction.seller_brokerage || "Unknown"}
Transaction Coordinator: ${transaction.agent || "Unknown"} | Email: ${transaction.agent_email || "N/A"}
Client Email: ${transaction.client_email || "N/A"} | Client Phone: ${transaction.client_phone || "N/A"}
Title Company: ${transaction.closing_title_company || "N/A"} | Contact: ${transaction.title_company_contact_name || "N/A"} | Email: ${transaction.title_company_email || "N/A"} | Phone: ${transaction.title_company_phone || "N/A"}
Lender: ${transaction.lender_name || "N/A"} | Company: ${transaction.lender_company || "N/A"} | Email: ${transaction.lender_email || "N/A"} | Phone: ${transaction.lender_phone || "N/A"}
Inspector: ${transaction.inspector_name || "N/A"} | Company: ${transaction.inspector_company || "N/A"} | Email: ${transaction.inspector_email || "N/A"} | Phone: ${transaction.inspector_phone || "N/A"}
Appraiser: ${transaction.appraiser_name || "N/A"} | Company: ${transaction.appraiser_company || "N/A"} | Email: ${transaction.appraiser_email || "N/A"} | Phone: ${transaction.appraiser_phone || "N/A"}
Attorney: ${transaction.attorney_name || "N/A"} | Firm: ${transaction.attorney_firm || "N/A"} | Email: ${transaction.attorney_email || "N/A"} | Phone: ${transaction.attorney_phone || "N/A"}

=== FINANCIAL ===
Sale Price: ${transaction.sale_price ? `$${transaction.sale_price.toLocaleString()}` : "Not set"}
Commission: ${transaction.commission || "Not set"}

=== KEY DATES ===
Contract Date: ${transaction.contract_date || "Not set"}
Closing Date: ${transaction.closing_date || "Not set"}

=== UPCOMING DEADLINES ===
${upcomingDeadlines || "No deadlines set."}

=== TASKS ===
Pending (${pendingTasks.length}): ${pendingTasks.slice(0, 10).map((t) => t.name).join(", ") || "None"}
Completed (${completedTasks.length}): ${completedTasks.slice(0, 5).map((t) => t.name).join(", ") || "None"}

=== UPLOADED DOCUMENTS ===
${docList}

=== DOCUMENT CHECKLIST STATUS ===
Approved: ${approvedDocs}/${totalDocs}
Missing Documents:
${missingDocs}

=== COMPLIANCE ISSUES ===
${complianceIssues}

=== YOUR CAPABILITIES ===
You can help with:
- Answering questions about this transaction
- Summarizing the deal status
- Identifying missing documents or compliance issues
- Explaining upcoming deadlines and urgency
- Drafting professional emails (to lenders, agents, title companies, clients)
- Drafting contract addendum language
- Explaining what tasks need to be done next
- Commission calculations and explanations
- Advising on next steps for the current phase

Always be professional, concise, and transaction-specific. Reference the actual data above in your responses. When drafting emails, include proper subject lines and professional formatting. Today's date is ${format(today, "MMMM d, yyyy")}.`;
}

const QUICK_PROMPTS = [
  "What deadlines are coming up?",
  "What documents are missing?",
  "Summarize this deal",
  "Draft an email to the lender requesting commitment letter",
  "Any compliance issues?",
  "What are the next steps?",
];

export default function TCAIAssistant({ transaction: initialTransaction, currentUser }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello! I'm your AI Transaction Coordinator for **${initialTransaction.address}**. I have full context on this deal including parties, deadlines, documents, and compliance status. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Always fetch fresh transaction data so AI has latest edits
  const { data: txList = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
    staleTime: 0,
    refetchInterval: 10_000,
  });
  const transaction = txList.find(t => t.id === initialTransaction.id) || initialTransaction;

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", transaction.id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transaction.id }),
    staleTime: 0,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["checklist", transaction.id],
    queryFn: () => base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id }),
    staleTime: 0,
  });

  const { data: complianceReports = [] } = useQuery({
    queryKey: ["compliance", transaction.id],
    queryFn: () => base44.entities.ComplianceReport.filter({ transaction_id: transaction.id }),
  });

  const { data: complianceIssuesList = [] } = useQuery({
    queryKey: ["compliance-issues", transaction.id],
    queryFn: () => base44.entities.ComplianceIssue.filter({ transaction_id: transaction.id, status: "open" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    const systemPrompt = buildSystemPrompt(transaction, documents, checklistItems, complianceReports, complianceIssuesList);

    const conversationHistory = newMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${systemPrompt}

=== CONVERSATION HISTORY ===
${conversationHistory}

Respond to the user's latest message. Be helpful, professional, and reference specific transaction data when relevant.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Chat cleared. I still have full context on **${transaction.address}**. What do you need?`,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Transaction Assistant</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Context-aware · {transaction.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            Live Context
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearChat} className="h-7 px-2 text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Clear
          </Button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2.5 border-b flex gap-2 overflow-x-auto" style={{ borderColor: "var(--card-border)" }}>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 hover:opacity-80"
            style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "user" ? "bg-blue-600" : "bg-slate-700"
            }`}>
              {msg.role === "user"
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-white" />
              }
            </div>
            <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : ""
            }`} style={msg.role !== "user" ? { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--card-border)" } : {}}>
              <FormattedMessage content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Ask anything about this transaction..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none text-sm flex-1"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="h-10 w-10 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function FormattedMessage({ content }) {
  // Simple markdown-ish rendering for bold, bullets, line breaks
  const lines = content.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={i} className="flex gap-1.5 mt-1"><span>•</span><span>{rendered.slice(1)}</span></div>;
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <div key={i}>{rendered}</div>;
      })}
    </div>
  );
}