import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Called by entity automation on Transaction create/update.
 * If the transaction has buyers_agent_email or sellers_agent_email,
 * looks up matching Contact → Agent → reference_code and stamps allowed_agent_code.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { event, data } = body;
  if (!data) return Response.json({ ok: true });

  const tx = data;

  // Already has a code — skip unless we're explicitly told to re-stamp
  // (allow re-stamp in case agent changed)

  // Determine which agent email to use
  // Priority: buyers_agent_email for buyer transactions, sellers_agent_email for seller/listing
  const agentEmail = tx.transaction_type === "seller"
    ? (tx.sellers_agent_email || tx.buyers_agent_email)
    : (tx.buyers_agent_email || tx.sellers_agent_email);

  if (!agentEmail) return Response.json({ ok: true, reason: "no_agent_email" });

  // Find matching contact
  const allContacts = await base44.asServiceRole.entities.Contact.list();
  const contact = allContacts.find(c =>
    c.email?.toLowerCase().trim() === agentEmail.toLowerCase().trim()
  );
  if (!contact) return Response.json({ ok: true, reason: "no_contact_match" });

  // Find agent record
  const allAgents = await base44.asServiceRole.entities.Agent.list();
  const agent = allAgents.find(a => a.contact_id === contact.id && a.reference_code);
  if (!agent) return Response.json({ ok: true, reason: "no_agent_with_code" });

  // Only update if different to avoid infinite loops
  if (tx.allowed_agent_code === agent.reference_code) {
    return Response.json({ ok: true, reason: "already_stamped" });
  }

  await base44.asServiceRole.entities.Transaction.update(tx.id, {
    allowed_agent_code: agent.reference_code,
  });

  return Response.json({ ok: true, stamped: agent.reference_code });
});