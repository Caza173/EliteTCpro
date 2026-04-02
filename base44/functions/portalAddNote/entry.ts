import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate limit note submissions per code
const noteLog = new Map();
function isRateLimited(code) {
  const now = Date.now();
  const entries = (noteLog.get(code) || []).filter(t => now - t < 3600_000);
  if (entries.length >= 30) return true;
  entries.push(now);
  noteLog.set(code, entries);
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { agent_code, transaction_id, message } = await req.json();

    if (!agent_code || !transaction_id || !message?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalCode = agent_code.trim().toUpperCase();
    if (isRateLimited(normalCode)) {
      return Response.json({ error: 'Too many notes submitted. Please slow down.' }, { status: 429 });
    }

    // Verify the agent_code matches the transaction (security check)
    const allTx = await base44.asServiceRole.entities.Transaction.list('-updated_date', 2000);
    const tx = allTx.find(t =>
      t.id === transaction_id &&
      (t.agent_code || '').trim().toUpperCase() === normalCode
    );

    if (!tx) {
      return Response.json({ error: 'Invalid code or transaction.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Note.create({
      transaction_id: tx.id,
      brokerage_id: tx.brokerage_id,
      title: message.trim().slice(0, 80),
      message: message.trim(),
      note_type: 'agent_action',
      visibility: 'agent',
      is_pinned: false,
      created_by: 'agent-portal',
      created_by_name: 'Agent (Portal)',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});