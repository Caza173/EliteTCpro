import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import PizZip from 'npm:pizzip@3.1.7';
import Docxtemplater from 'npm:docxtemplater@3.60.0';

// The NHAR Addendum template URL (uploaded by the app owner)
const TEMPLATE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9cd0677a8832ab0cc59bc/2deae3da4_AddendumtoPurchaseandSalesAgreementNHARversion1.docx";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { transaction_id, addendum_clause, notification_id } = body;

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    // Fetch the transaction
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Build merge fields
    const buyers = (tx.buyers?.length ? tx.buyers : [tx.buyer]).filter(Boolean).join(' and ') || '';
    const sellers = (tx.sellers?.length ? tx.sellers : [tx.seller]).filter(Boolean).join(' and ') || '';
    const contractDate = tx.contract_date
      ? new Date(tx.contract_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    // Pull verbiage from notification if not provided directly
    let clause = addendum_clause || '';
    if (!clause && notification_id) {
      const notifList = await base44.asServiceRole.entities.InAppNotification.filter({ id: notification_id });
      clause = notifList[0]?.addendum_verbiage || '';
    }

    const mergeData = {
      buyer_name: buyers,
      seller_name: sellers,
      property_address: tx.address || '',
      contract_date: contractDate,
      addendum_clause: clause,
    };

    // Download the DOCX template
    const templateRes = await fetch(TEMPLATE_URL);
    if (!templateRes.ok) {
      return Response.json({ error: 'Failed to fetch template' }, { status: 500 });
    }
    const templateBuffer = await templateRes.arrayBuffer();

    // Load and fill the template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(mergeData);

    const filledBuffer = doc.getZip().generate({ type: 'uint8array' });

    const fileName = `Addendum_${tx.address?.replace(/[^a-zA-Z0-9]/g, '_') || 'Transaction'}.docx`;

    return new Response(filledBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});