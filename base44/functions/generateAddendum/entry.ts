import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

// NHAR Addendum default field map — calibrated to the actual PDF layout
// PDF page size: 8.5" x 11" = 612 x 792 pts at 72dpi
// jsPDF uses mm by default; we'll work in mm (letter: 215.9 x 279.4mm)
const NHAR_DEFAULT_FIELD_MAP = {
  effective_date: { x: 130, y: 52, maxWidth: 60, fontSize: 10 },
  seller_name:    { x: 14,  y: 60, maxWidth: 160, fontSize: 10 },
  buyer_name:     { x: 14,  y: 68, maxWidth: 160, fontSize: 10 },
  property_address: { x: 40, y: 76, maxWidth: 155, fontSize: 10 },
  clauses:        { x: 16,  y: 92,  maxWidth: 183, fontSize: 10, multiline: true, maxHeight: 130 },
};

function wrapText(doc, text, x, y, maxWidth, fontSize, lineHeight, maxHeight) {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const maxLines = maxHeight ? Math.floor(maxHeight / lineHeight) : lines.length;
  let currentY = y;
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    doc.text(lines[i], x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template_id, transaction_id, clause_ids, custom_text, brokerage_id } = await req.json();

    // Fetch template (optional — if none uploaded, use built-in NHAR form)
    let template = null;
    if (template_id) {
      const templates = await base44.asServiceRole.entities.PDFTemplate.filter({ id: template_id });
      template = templates[0] || null;
    }

    // Fetch transaction — try by service role, fall back to user-scoped
    let transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    if (!transactions.length) {
      transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    }
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Fetch clauses if provided
    let clauseTexts = [];
    if (clause_ids && clause_ids.length > 0) {
      const allClauses = await base44.asServiceRole.entities.Clause.filter({ brokerage_id });
      const selected = allClauses.filter(c => clause_ids.includes(c.id));
      clauseTexts = selected.map((c, i) => `${i + 1}. ${c.name}\n${c.text}`);
    }
    if (custom_text) {
      clauseTexts.push(custom_text);
    }
    const clausesContent = clauseTexts.join('\n\n');

    // Use template field_map or fall back to NHAR defaults
    const fieldMap = (template?.field_map && Object.keys(template.field_map).length > 0)
      ? template.field_map
      : NHAR_DEFAULT_FIELD_MAP;

    // Build data from transaction
    const buyerName  = transaction.buyers?.join(', ') || transaction.buyer || '';
    const sellerName = transaction.sellers?.join(', ') || transaction.seller || '';
    const address    = transaction.address || '';
    const effectiveDate = transaction.contract_date
      ? new Date(transaction.contract_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    // --- Generate PDF using jsPDF (overlay on white background) ---
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });

    // If we have the original PDF URL, we embed it as background image
    // Otherwise draw a clean form
    let bgLoaded = false;
    if (template?.file_url) {
      try {
        const resp = await fetch(template.file_url);
        const buf = await resp.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        doc.addImage(`data:application/pdf;base64,${b64}`, 'PDF', 0, 0, 215.9, 279.4);
        bgLoaded = true;
      } catch (_) { /* fall through to drawn form */ }
    }

    if (!bgLoaded) {
      // Draw minimal NHAR form outline
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ADDENDUM', 107.95, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.text('TO THE PURCHASE AND SALES AGREEMENT', 107.95, 27, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('This Addendum to the Purchase and Sales Agreement with an effective date of', 14, 52);
      doc.text('between', 195, 52, { align: 'right' });
      doc.line(14, 61, 185, 61); doc.text('("SELLER"), and', 195, 61, { align: 'right' });
      doc.line(14, 69, 185, 69); doc.text('("BUYER"), for', 195, 69, { align: 'right' });
      doc.text('the property located at', 14, 77);
      doc.line(55, 77, 201, 77);
      doc.text('hereby agree to the following:', 14, 84);
      doc.rect(14, 88, 187, 135);
      doc.setFontSize(8);
      doc.text('All other aspects of the aforementioned Purchase and Sales Agreement shall remain in full force and effect.', 14, 232, { maxWidth: 187 });
    }

    // --- Overlay text fields ---
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lineHeight = 5;

    const overlayField = (fieldKey, value) => {
      const fm = fieldMap[fieldKey];
      if (!fm || !value) return;
      const fs = fm.fontSize || 10;
      doc.setFontSize(fs);
      if (fm.multiline) {
        wrapText(doc, value, fm.x, fm.y, fm.maxWidth, fs, lineHeight, fm.maxHeight);
      } else {
        doc.text(value, fm.x, fm.y, { maxWidth: fm.maxWidth });
      }
    };

    overlayField('effective_date', effectiveDate);
    overlayField('seller_name', sellerName);
    overlayField('buyer_name', buyerName);
    overlayField('property_address', address);
    overlayField('clauses', clausesContent);

    // Output as base64
    const pdfB64 = doc.output('datauristring');
    const base64Data = pdfB64.split(',')[1];

    // Convert base64 to binary and upload
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const fileName = `Addendum - ${address.replace(/[^a-zA-Z0-9 ]/g, '').trim()}.pdf`;
    const formData = new FormData();
    formData.append('file', blob, fileName);

    // Upload via SDK
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    // Save to Documents entity
    const doc_record = await base44.asServiceRole.entities.Document.create({
      transaction_id,
      brokerage_id,
      doc_type: 'addendum',
      file_url,
      file_name: fileName,
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      notes: `Generated from template: ${template.name}`,
    });

    return Response.json({ success: true, file_url, file_name: fileName, document_id: doc_record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});