import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { transaction_id, file_name, brokerage_id: bodyBrokerageId } = body;

    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });
    if (!file_name) return Response.json({ error: 'file_name required' }, { status: 400 });

    // Resolve brokerage_id
    let brokerage_id = user.data?.brokerage_id || bodyBrokerageId;
    if (!brokerage_id) {
      const brokerages = await base44.asServiceRole.entities.Brokerage.list();
      brokerage_id = brokerages[0]?.id;
    }
    if (!brokerage_id) {
      return Response.json({ error: 'No brokerage found' }, { status: 400 });
    }

    // ── DB-level duplicate check ─────────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.Document.filter({
      transaction_id,
      file_name,
      is_deleted: { $ne: true },
    });

    if (existing.length > 0) {
      return Response.json(
        { error: `A document named "${file_name}" already exists for this transaction. Delete the existing file first, or rename yours before uploading.`, duplicate: true },
        { status: 409 }
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    const doc = await base44.asServiceRole.entities.Document.create({
      ...body,
      brokerage_id,
    });

    console.log(`[createDocument] Created doc ${doc.id} (${file_name}) for tx ${transaction_id}`);
    return Response.json(doc);

  } catch (error) {
    console.error('createDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});