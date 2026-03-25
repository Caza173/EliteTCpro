import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Key, Copy, RefreshCw, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AgentCodePanel — shows agent reference codes for a given user.
 * inline=true: compact single-line display for table rows.
 * inline=false (default): full panel for the detail dialog.
 */
export default function AgentCodePanel({ agentUser, transactions = [], inline = false }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: agents = [], refetch: refetchAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => base44.entities.Agent.list(),
  });

  const userContactIds = contacts
    .filter(c => c.email?.toLowerCase() === agentUser.email?.toLowerCase())
    .map(c => c.id);

  const userAgents = agents.filter(a => userContactIds.includes(a.contact_id));

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async (agentId) => {
    setGenerating(agentId);
    await base44.functions.invoke("generateAgentCode", { agent_id: agentId });
    await refetchAgents();
    setGenerating(null);
  };

  const handleCreateAgent = async () => {
    setGenerating("new");
    let contact = contacts.find(c => c.email?.toLowerCase() === agentUser.email?.toLowerCase());
    if (!contact) {
      const nameParts = (agentUser.full_name || "").split(" ");
      contact = await base44.entities.Contact.create({
        first_name: nameParts[0] || agentUser.email,
        last_name: nameParts.slice(1).join(" ") || "",
        email: agentUser.email,
        role_type: "agent",
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    }
    const newAgent = await base44.entities.Agent.create({
      contact_id: contact.id,
      agent_role: "buyer_agent",
    });
    await base44.functions.invoke("generateAgentCode", { agent_id: newAgent.id });
    await refetchAgents();
    setGenerating(null);
  };

  // ── Inline mode (table row) ───────────────────────────────────────────────
  if (inline) {
    const agent = userAgents[0];
    if (!agent) {
      return (
        <button
          onClick={handleCreateAgent}
          disabled={generating === "new"}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {generating === "new"
            ? <RefreshCw className="w-3 h-3 animate-spin" />
            : <Plus className="w-3 h-3" />}
          Generate
        </button>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        {agent.reference_code ? (
          <code className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
            {agent.reference_code}
          </code>
        ) : (
          <span className="text-xs text-gray-400 italic">No code</span>
        )}
        {agent.reference_code && (
          <button onClick={() => handleCopy(agent.reference_code)} title="Copy" className="p-0.5 rounded hover:opacity-70">
            {copied === agent.reference_code
              ? <Check className="w-3 h-3 text-emerald-500" />
              : <Copy className="w-3 h-3 text-gray-400" />}
          </button>
        )}
        <button
          onClick={() => handleGenerate(agent.id)}
          disabled={generating === agent.id}
          title="Regenerate"
          className="p-0.5 rounded hover:opacity-70"
        >
          <RefreshCw className={`w-3 h-3 text-gray-400 ${generating === agent.id ? "animate-spin" : ""}`} />
        </button>
      </div>
    );
  }

  // ── Full panel mode (detail dialog) ──────────────────────────────────────
  if (userAgents.length === 0) {
    return (
      <div className="px-3 py-2.5 rounded-lg border border-dashed flex items-center justify-between gap-3"
        style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No agent code yet</span>
        </div>
        <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2"
          onClick={handleCreateAgent} disabled={generating === "new"}>
          {generating === "new" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Generate Code
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {userAgents.map(agent => (
        <div key={agent.id} className="rounded-lg border p-3 space-y-2"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-2">
            {agent.reference_code ? (
              <code className="flex-1 font-mono text-sm font-bold px-3 py-1.5 rounded-lg tracking-widest"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {agent.reference_code}
              </code>
            ) : (
              <span className="flex-1 text-xs italic" style={{ color: "var(--text-muted)" }}>No code assigned</span>
            )}
            {agent.reference_code && (
              <button onClick={() => handleCopy(agent.reference_code)}
                className="p-1.5 rounded-lg hover:opacity-80" style={{ background: "var(--bg-tertiary)" }} title="Copy">
                {copied === agent.reference_code
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
              </button>
            )}
            <button onClick={() => handleGenerate(agent.id)} disabled={generating === agent.id}
              className="p-1.5 rounded-lg hover:opacity-80" style={{ background: "var(--bg-tertiary)" }} title="Regenerate">
              <RefreshCw className={`w-3.5 h-3.5 ${generating === agent.id ? "animate-spin" : ""}`}
                style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1"
        onClick={handleCreateAgent} disabled={generating === "new"}>
        {generating === "new" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        Add Another Code
      </Button>
    </div>
  );
}