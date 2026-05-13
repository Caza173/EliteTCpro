import React, { useRef, useEffect, useState } from 'react';
import { X, Minus, Send, Loader2, Bot, User, RefreshCw, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAIConversation } from '@/lib/AIConversationContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const QUICK_PROMPTS = [
  'Daily briefing',
  'What deals need attention today?',
  'Which transactions are at risk?',
  'What deadlines are this week?',
];

function buildGlobalSystemPrompt(transactions, documents, checklistItems, complianceReports, monitorAlerts = []) {
  const today = new Date();
  const active = transactions.filter((t) => t.status === 'active');
  const pending = transactions.filter((t) => t.status === 'pending');
  const closed = transactions.filter((t) => t.status === 'closed');

  const DEADLINE_FIELDS = [
    { key: 'inspection_deadline', label: 'Inspection' },
    { key: 'earnest_money_deadline', label: 'Earnest Money' },
    { key: 'appraisal_deadline', label: 'Appraisal' },
    { key: 'financing_deadline', label: 'Financing Commitment' },
    { key: 'due_diligence_deadline', label: 'Due Diligence' },
    { key: 'closing_date', label: 'Closing' },
  ];

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
    .map((d) => `  - ${d.label} | ${d.address} | ${d.daysLeft === 0 ? 'TODAY' : `${d.daysLeft}d`}`)
    .join('\n') || '  None in next 14 days';

  const overdueText = overdueDeadlines.slice(0, 10)
    .map((d) => `  - ${d.label} | ${d.address} | ${Math.abs(d.daysLeft)}d overdue`)
    .join('\n') || '  None';

  const missingByTx = {};
  checklistItems.filter((ci) => ci.status === 'missing').forEach((ci) => {
    if (!missingByTx[ci.transaction_id]) missingByTx[ci.transaction_id] = [];
    missingByTx[ci.transaction_id].push(ci.label || ci.doc_type);
  });

  const missingDocsText = Object.entries(missingByTx).slice(0, 15)
    .map(([txId, docs]) => {
      const tx = transactions.find((t) => t.id === txId);
      return `  - ${tx?.address || txId}: ${docs.join(', ')}`;
    })
    .join('\n') || '  None';

  return `You are an expert AI Transaction Coordinator Assistant. You have access to all transactions, deadlines, documents, and compliance data.

Today's date: ${today.toLocaleDateString()}

=== PORTFOLIO OVERVIEW ===
Active: ${active.length} | Pending: ${pending.length} | Closed: ${closed.length}

=== UPCOMING DEADLINES (next 14 days) ===
${deadlinesText}

=== OVERDUE DEADLINES ===
${overdueText}

=== MISSING DOCUMENTS ===
${missingDocsText}

When asked about specific transactions, reference the actual address and data. Format responses clearly. If asked for a "daily briefing", provide a structured summary covering critical alerts, closing soon, upcoming deadlines, and missing documents.`;
}

function FormattedMessage({ content }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        if (line.startsWith('### ')) return <p key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</p>;
        if (line.startsWith('## ')) return <p key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</p>;
        if (line.startsWith('# ')) return <p key={i} className="font-bold text-lg mt-2 mb-1">{line.slice(2)}</p>;
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} className="flex gap-1.5 text-sm"><span className="text-gray-400 flex-shrink-0">•</span><span>{rendered.slice(1)}</span></div>;
        }
        if (line.startsWith('---')) return <hr key={i} className="my-2 opacity-20" />;
        if (line.trim() === '') return <div key={i} className="h-1.5" />;
        return <div key={i} className="text-sm">{rendered}</div>;
      })}
    </div>
  );
}

export default function AIModal({ transactions = [], checklistItems = [] }) {
  const { isOpen, setIsOpen, isMinimized, setIsMinimized, messages, setMessages, addMessage, clearChat } = useAIConversation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['allDocuments'],
    queryFn: () => base44.entities.Document.list(),
    staleTime: 60_000,
  });

  const { data: complianceReports = [] } = useQuery({
    queryKey: ['allCompliance'],
    queryFn: () => base44.entities.ComplianceReport.list(),
    staleTime: 60_000,
  });

  const { data: monitorAlerts = [] } = useQuery({
    queryKey: ['monitor-alerts'],
    queryFn: () => base44.entities.MonitorAlert.filter({ alert_state: 'active' }, '-generated_at', 100),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (messagesContainerRef.current && !isMinimized) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading, isMinimized]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    addMessage('user', userText);
    setLoading(true);

    const systemPrompt = buildGlobalSystemPrompt(transactions, documents, checklistItems, complianceReports, monitorAlerts);
    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${systemPrompt}\n\n=== CONVERSATION ===\n${conversationHistory}\n\nUser: ${userText}\n\nRespond helpfully and professionally.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    addMessage('assistant', response);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200 backdrop-blur-sm"
        style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed z-50 transition-all duration-300 flex flex-col ${
          isMinimized
            ? 'bottom-6 right-6 w-80 h-16'
            : 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto w-full h-full sm:w-[700px] sm:h-[75vh] rounded-lg'
        }`}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: isMinimized
            ? '0 8px 32px rgba(0, 0, 0, 0.2)'
            : '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--card-border)', background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)' }}
        >
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold">AI Transaction Commander</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
              aria-label={isMinimized ? 'Expand modal' : 'Minimize modal'}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4 text-white" /> : <Minus className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            {/* Quick prompts */}
            <div
              className="px-6 py-3 border-b flex gap-2 overflow-x-auto flex-wrap"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-tertiary)' }}
            >
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={loading}
                  className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-subtle)' }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
              style={{ background: 'var(--card-bg)' }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white text-sm' : ''}`}
                    style={msg.role !== 'user' ? { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' } : {}}
                  >
                    {msg.role === 'user' ? <p className="text-sm">{msg.content}</p> : <FormattedMessage content={msg.content} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 pb-4 pt-3 border-t flex-shrink-0" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="Ask about deadlines, compliance, deals..."
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
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Enter to send · Esc to close</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}