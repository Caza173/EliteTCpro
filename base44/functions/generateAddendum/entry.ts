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

    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '-');
    const fileName = `Addendum - ${address.replace(/[^a-zA-Z0-9 ]/g, '').trim()} (${ts}).pdf`;
    let pdfBytes;

    // ── PATH A: Template PDF uploaded ───────────────────────────────────────
    if (template?.file_url) {
      const resp = await fetch(template.file_url);
      const existingPdfBytes = await resp.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const fieldValues = {
        effective_date: effectiveDate,
        seller_name: sellerName,
        buyer_name: buyerName,
        property_address: address,
        clauses: clausesContent,
      };

      // Try AcroForm filling first
      let usedAcroForm = false;
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        if (fields.length > 0) {
          for (const [key, value] of Object.entries(fieldValues)) {
            if (!value) continue;
            try {
              const field = form.getTextField(key);
              field.setText(value);
            } catch (_) {
              // field not found by that name — skip
            }
          }
          form.flatten();
          usedAcroForm = true;
        }
      } catch (_) {
        // No form or error — fall through to coordinate overlay
      }

      // Coordinate overlay fallback
      if (!usedAcroForm) {
        const rawFieldMap = (template.field_map && Object.keys(template.field_map).length > 0)
          ? template.field_map
          : NHAR_DEFAULT_FIELD_MAP;

        // Extract global offset (saved by TemplateFieldMapper)
        const ox = rawFieldMap._offset_x || 0;
        const oy = rawFieldMap._offset_y || 0;

        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidthPt, height: pageHeightPt } = firstPage.getSize();
        const PAGE_W_MM = 215.9;
        const PAGE_H_MM = 279.4;

        const fieldValues = {
          effective_date: effectiveDate,
          seller_name: sellerName,
          buyer_name: buyerName,
          property_address: address,
          clauses: clausesContent,
        };

        for (const [fieldKey, value] of Object.entries(fieldValues)) {
          if (!value) continue;
          const fm = rawFieldMap[fieldKey];
          if (!fm) continue;

          const rawX = (fm.x || 0) + ox;
          const rawY = (fm.y || 0) + oy;

          // Clamp to page bounds
          const clampedX = Math.max(0, Math.min(PAGE_W_MM - 5, rawX));
          const clampedY = Math.max(0, Math.min(PAGE_H_MM - 3, rawY));

          const x = mmToPt(clampedX);
          // PDF Y origin = bottom-left, so flip
          const y = pageHeightPt - mmToPt(clampedY);
          const fontSize = fm.fontSize || 10;
          const maxWidthPt = mmToPt(Math.min(fm.maxWidth || 180, PAGE_W_MM - clampedX));

          if (fm.multiline) {
            const lineHeightPt = fontSize * 1.35;
            const maxHeightPt = fm.maxHeight ? mmToPt(fm.maxHeight) : (y);
            const maxLines = Math.floor(maxHeightPt / lineHeightPt);

            // Word wrap with newline support
            const words = value.split(' ');
            const lines = [];
            let cur = '';
            for (const word of words) {
              const chunks = word.split('\n');
              for (let ci = 0; ci < chunks.length; ci++) {
                const test = cur ? `${cur} ${chunks[ci]}` : chunks[ci];
                const testW = helvetica.widthOfTextAtSize(test, fontSize);
                if (testW > maxWidthPt && cur) { lines.push(cur); cur = chunks[ci]; }
                else { cur = test; }
                if (ci < chunks.length - 1) { lines.push(cur); cur = ''; }
              }
            }
            if (cur) lines.push(cur);

            let drawY = y;
            for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
              if (drawY < 5) break;
              firstPage.drawText(lines[i] || ' ', { x, y: drawY, size: fontSize, font: helvetica, color: rgb(0, 0, 0) });
              drawY -= lineHeightPt;
            }
          } else {
            const safe = String(value).substring(0, 300);
            firstPage.drawText(safe, { x, y: Math.max(5, y), size: fontSize, font: helvetica, color: rgb(0, 0, 0), maxWidth: maxWidthPt });
          }
        }
      }

      pdfBytes = await pdfDoc.save();

    // ── PATH B: No template — draw built-in NHAR form with jsPDF ───────────
    } else {
      const fieldMap = NHAR_DEFAULT_FIELD_MAP;
      // Note: no global offset for built-in form (offsets only apply to custom templates)
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

      // Overlay text with offset + clamping
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const PAGE_W_MM2 = 215.9;
      const PAGE_H_MM2 = 279.4;

      const fieldValues2 = {
        effective_date: effectiveDate,
        seller_name: sellerName,
        buyer_name: buyerName,
        property_address: address,
        clauses: clausesContent,
      };

      for (const [fieldKey, value] of Object.entries(fieldValues2)) {
        if (!value) continue;
        const fm = fieldMap[fieldKey];
        if (!fm) continue;
        const fs = fm.fontSize || 10;
        const rawX = fm.x || 0;
        const rawY = fm.y || 0;
        const x = Math.max(0, Math.min(PAGE_W_MM2 - 5, rawX));
        const y = Math.max(3, Math.min(PAGE_H_MM2 - 3, rawY));
        const maxW = Math.min(fm.maxWidth || 180, PAGE_W_MM2 - x);
        doc.setFontSize(fs);
        if (fm.multiline) {
          wrapText(doc, value, x, y, maxW, fs, fs * 0.45, fm.maxHeight || 130);
        } else {
          doc.text(String(value), x, y, { maxWidth: maxW });
        }
      }

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