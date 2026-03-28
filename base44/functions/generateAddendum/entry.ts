import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

// NHAR Addendum default field map (used when no custom template uploaded)
// jsPDF units: mm, letter = 215.9 x 279.4mm
const NHAR_DEFAULT_FIELD_MAP = {
  effective_date:   { x: 130, y: 46,  maxWidth: 55,  fontSize: 10 },
  seller_name:      { x: 14,  y: 54,  maxWidth: 145, fontSize: 10 },
  buyer_name:       { x: 14,  y: 62,  maxWidth: 145, fontSize: 10 },
  property_address: { x: 55,  y: 70,  maxWidth: 130, fontSize: 10 },
  clauses:          { x: 16,  y: 82,  maxWidth: 183, fontSize: 10, multiline: true, maxHeight: 130 },
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

// mm → pdf-lib points (1 inch = 72 pts = 25.4mm)
function mmToPt(mm) { return (mm / 25.4) * 72; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template_id, transaction_id, clause_ids, custom_text, brokerage_id } = await req.json();

    // Fetch template (optional)
    let template = null;
    if (template_id) {
      const templates = await base44.asServiceRole.entities.PDFTemplate.filter({ id: template_id });
      template = templates[0] || null;
    }

    // Fetch transaction
    let transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    if (!transactions.length) {
      transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    }
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Fetch clauses
    let clauseTexts = [];
    if (clause_ids && clause_ids.length > 0) {
      const allClauses = await base44.asServiceRole.entities.Clause.filter({ brokerage_id });
      const selected = allClauses.filter(c => clause_ids.includes(c.id));
      clauseTexts = selected.map((c, i) => `${i + 1}. ${c.name}\n${c.text}`);
    }
    if (custom_text) clauseTexts.push(custom_text);
    const clausesContent = clauseTexts.join('\n\n');

    // Transaction data
    const buyerName     = transaction.buyers?.join(', ') || transaction.buyer || '';
    const sellerName    = transaction.sellers?.join(', ') || transaction.seller || '';
    const address       = transaction.address || '';
    const effectiveDate = transaction.contract_date
      ? new Date(transaction.contract_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const fileName = `Addendum - ${address.replace(/[^a-zA-Z0-9 ]/g, '').trim()}.pdf`;
    let pdfBytes;

    // ── PATH A: Template PDF uploaded — overlay text using pdf-lib ──────────
    if (template?.file_url) {
      const fieldMap = (template.field_map && Object.keys(template.field_map).length > 0)
        ? template.field_map
        : NHAR_DEFAULT_FIELD_MAP;

      // Download the original PDF
      const resp = await fetch(template.file_url);
      const existingPdfBytes = await resp.arrayBuffer();

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // We overlay text on the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height: pageHeight } = firstPage.getSize();

      // pdf-lib origin is bottom-left; field_map coords are top-left (mm)
      // Convert: pdfY = pageHeight - mmToPt(y)
      const overlayField = (fieldKey, value) => {
        const fm = fieldMap[fieldKey];
        if (!fm || !value) return;
        const fontSize = fm.fontSize || 10;
        const x = mmToPt(fm.x);

        if (fm.multiline) {
          // Simple line-wrap for clauses
          const maxWidthPt = mmToPt(fm.maxWidth);
          const lineHeightPt = fontSize * 1.4;
          const maxHeightPt = fm.maxHeight ? mmToPt(fm.maxHeight) : 999;
          const maxLines = Math.floor(maxHeightPt / lineHeightPt);

          // Rough character-based wrapping
          const avgCharWidth = fontSize * 0.5;
          const charsPerLine = Math.floor(maxWidthPt / avgCharWidth);
          const words = value.split(' ');
          const lines = [];
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            // Handle explicit newlines
            const parts = testLine.split('\n');
            if (parts.length > 1) {
              for (let p = 0; p < parts.length - 1; p++) {
                lines.push(parts[p]);
                currentLine = '';
              }
              currentLine = parts[parts.length - 1];
            } else if (testLine.length > charsPerLine) {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          let currentY = fm.y; // in mm from top
          for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            const yPt = pageHeight - mmToPt(currentY);
            firstPage.drawText(lines[i] || '', {
              x, y: yPt, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
            });
            currentY += (lineHeightPt / 72) * 25.4; // convert pt increment back to mm for next line
          }
        } else {
          const yPt = pageHeight - mmToPt(fm.y);
          firstPage.drawText(value, {
            x, y: yPt, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
            maxWidth: mmToPt(fm.maxWidth),
          });
        }
      };

      overlayField('effective_date', effectiveDate);
      overlayField('seller_name', sellerName);
      overlayField('buyer_name', buyerName);
      overlayField('property_address', address);
      overlayField('clauses', clausesContent);

      pdfBytes = await pdfDoc.save();

    // ── PATH B: No template — draw built-in NHAR form with jsPDF ───────────
    } else {
      const fieldMap = NHAR_DEFAULT_FIELD_MAP;
      const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });

      // Draw form
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

      // Overlay text
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

      const pdfB64 = doc.output('datauristring').split(',')[1];
      const binaryStr = atob(pdfB64);
      pdfBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) pdfBytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload — must be a File object (named Blob) for multipart upload
    const blob = new File([pdfBytes], fileName, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    // Save to Documents
    const doc_record = await base44.asServiceRole.entities.Document.create({
      transaction_id,
      brokerage_id,
      doc_type: 'addendum',
      file_url,
      file_name: fileName,
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      notes: template ? `Generated from template: ${template.name}` : 'Generated from built-in NHAR form',
    });

    return Response.json({ success: true, file_url, file_name: fileName, document_id: doc_record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});