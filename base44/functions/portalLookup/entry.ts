import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Simple in-memory rate limiter
const requestLog = new Map();
function isRateLimited(code) {
  const now = Date.now();
  const entries = (requestLog.get(code) || []).filter(t => now - t < 3600_000);
  if (entries.length >= 20) return true;
  entries.push(now);
  requestLog.set(code, entries);
  return false;
}

function generateCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix + '-';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, code, transaction_id } = body;

    // ── Action: generate codes for a transaction (TC-only) ──────────────────
    if (action === 'generate_codes') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const allTx = await base44.asServiceRole.entities.Transaction.list('-updated_date', 2000);
      const tx = allTx.find(t => t.id === transaction_id);
      if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

      // Only generate if not already set
      const agent_code = tx.agent_code || generateCode('AGT');
      const client_code = tx.client_code || generateCode('CLT');

      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        agent_code,
        client_code,
        // keep legacy code in sync
        client_access_code: client_code,
      });

      return Response.json({ agent_code, client_code });
    }

    // ── Action: lookup by code (public, no auth required) ───────────────────
    if (!code) return Response.json({ error: 'Access code is required' }, { status: 400 });

    const normalCode = code.trim().toUpperCase();
    if (isRateLimited(normalCode)) {
      return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const allTx = await base44.asServiceRole.entities.Transaction.list('-updated_date', 2000);

    // Determine role by which code type matches
    let tx = null;
    let role = null;

    // Check agent_code first
    tx = allTx.find(t => (t.agent_code || '').trim().toUpperCase() === normalCode);
    if (tx) { role = 'agent'; }

    // Check client_code / legacy client_access_code
    if (!tx) {
      tx = allTx.find(t =>
        (t.client_code || '').trim().toUpperCase() === normalCode ||
        (t.client_access_code || '').trim().toUpperCase() === normalCode
      );
      if (tx) { role = 'client'; }
    }

    if (!tx || !role) {
      return Response.json({ error: 'No transaction found for this code. Please check and try again.' }, { status: 404 });
    }

    // Base fields available to both roles
    const base = {
      role,
      address: tx.address,
      status: tx.status,
      transaction_type: tx.transaction_type,
      transaction_phase: tx.transaction_phase,
      phase: tx.phase,
      phases_completed: tx.phases_completed || [],
      closing_date: tx.closing_date,
      contract_date: tx.contract_date,
      is_cash_transaction: tx.is_cash_transaction,
      risk_level: tx.risk_level,
      health_score: tx.health_score,
    };

    // Client view: only key dates, no agent/notes data
    if (role === 'client') {
      return Response.json({
        ...base,
        inspection_deadline: tx.inspection_deadline,
        appraisal_deadline: tx.appraisal_deadline,
        financing_deadline: tx.financing_deadline,
        due_diligence_deadline: tx.due_diligence_deadline,
        earnest_money_deadline: tx.earnest_money_deadline,
      });
    }

    // Agent view: key dates + shared notes
    const allNotes = await base44.asServiceRole.entities.Note.filter({ transaction_id: tx.id });
    const sharedNotes = allNotes
      .filter(n => n.visibility === 'agent' || n.visibility === 'client')
      .map(n => ({
        id: n.id,
        message: n.message,
        note_type: n.note_type,
        visibility: n.visibility,
        created_by_name: n.created_by_name || n.created_by,
        created_date: n.created_date,
        is_pinned: n.is_pinned,
      }))
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

    return Response.json({
      ...base,
      transaction_id: tx.id, // needed for agent note posting
      inspection_deadline: tx.inspection_deadline,
      appraisal_deadline: tx.appraisal_deadline,
      financing_deadline: tx.financing_deadline,
      due_diligence_deadline: tx.due_diligence_deadline,
      earnest_money_deadline: tx.earnest_money_deadline,
      sale_price: tx.sale_price,
      agent: tx.agent,
      notes: sharedNotes,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});