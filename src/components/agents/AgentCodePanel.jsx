import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Copy, RefreshCw, Check, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Shows for agent-role users in UserManagement.
 * Lists all Agent records linked to this user's email, shows their reference_code,
 * and lets TC/admin generate or regenerate codes.
 */
export default function AgentCodePanel({ agentUser, transactions = [] }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(null);

  // Fetch all contacts to find those matching this user's email
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  // Fetch all Agent records
  const { data: agents = [], refetch: refetchAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => base44.entities.Agent.list(),
  });

  // Match agents to this user via email on contact
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

  // Create a new Agent record for this user (linked via contact)
  const handleCreateAgent = async () => {
    setGenerating("new");
    // Find or create a contact for this user
    let contact = contacts.find(c => c.email?.toLowerCase() === agentUser.email?.toLowerCase());
    if (!contact) {
      const nameParts = (agentUser.full_name || "").split(" ");
      contact = await base44.entities.Contact.create({
        first_name: nameParts[0] || agentUser.email,
        last_name: nameParts.slice(1).join(" ") || "",
        email: agentUser.email,
        role_type: "agent",
      });
    }
    const newAgent = await base44.entities.Agent.create({
      contact_id: contact.id,
      agent_role: "buyer_agent",
    });
    await base44.functions.invoke("generateAgentCode", { agent_id: newAgent.id });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    await refetchAgents();
    setGenerating(null);
  };

  // Find transactions linked to each agent's code
  const txForAgent = (agent) =>
    transactions.filter(tx =>
      tx.allowed_agent_code?.trim().toUpperCase() === agent.reference_code?.trim().toUpperCase()
    );

  if (userAgents.length === 0) {
    return (
      <div className="mt-3 px-3 py-2.5 rounded-lg border border-dashed flex items-center justify-between gap-3"
        style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No agent code yet</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1 px-2"
          onClick={handleCreateAgent}
          disabled={generating === "new"}
        >
          {generating === "new"
            ? <RefreshCw className="w-3 h-3 animate-spin" />
            : <Plus className="w-3 h-3" />}
          Generate Code
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors"
        style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
      >
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span>Agent Code{userAgents.length > 1 ? `s (${userAgents.length})` : ""}</span>
          {userAgents[0]?.reference_code && (
            <code className="font-mono text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
              {userAgents[0].reference_code}
            </code>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {userAgents.map(agent => {
            const agentTx = txForAgent(agent);
            const contact = contacts.find(c => c.id === agent.contact_id);
            return (
              <div key={agent.id} className="rounded-lg border p-3 space-y-2"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {agent.agent_role === "listing_agent" ? "Listing Agent" : "Buyer Agent"}
                    </span>
                    {contact?.email && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{contact.email}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {agentTx.length} deal{agentTx.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

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
                    <button
                      onClick={() => handleCopy(agent.reference_code)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                      style={{ background: "var(--bg-tertiary)" }}
                      title="Copy code"
                    >
                      {copied === agent.reference_code
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                    </button>
                  )}

                  <button
                    onClick={() => handleGenerate(agent.id)}
                    disabled={generating === agent.id}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: "var(--bg-tertiary)" }}
                    title={agent.reference_code ? "Regenerate code" : "Generate code"}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generating === agent.id ? "animate-spin" : ""}`}
                      style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>

                {agentTx.length > 0 && (
                  <div className="space-y-0.5">
                    {agentTx.slice(0, 3).map(tx => (
                      <p key={tx.id} className="text-[11px]" style={{ color: "var(--text-muted)" }}>• {tx.address}</p>
                    ))}
                    {agentTx.length > 3 && (
                      <p className="text-[11px]" style={{ color: "var(--accent)" }}>+{agentTx.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs gap-1"
            onClick={handleCreateAgent}
            disabled={generating === "new"}
          >
            {generating === "new"
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Plus className="w-3 h-3" />}
            Add Another Agent Code
          </Button>
        </div>
      )}
    </div>
  );
}