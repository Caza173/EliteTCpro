import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const PAGE_W_MM = 215.9;
const PAGE_H_MM = 279.4;

function mmToPt(mm) { return (mm / 25.4) * 72; }

function wrapTextJsPDF(doc, text, x, y, maxWidth, fontSize, lineHeightMm, maxHeightMm) {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text), maxWidth);
  const maxLines = maxHeightMm ? Math.floor(maxHeightMm / lineHeightMm) : lines.length;
  let curY = y;
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    if (curY > PAGE_H_MM - 5) break;
    doc.text(lines[i], Math.max(0, x), curY);
    curY += lineHeightMm;
  }
}

function wrapTextPdfLib(page, text, x, y, maxWidthPt, fontSize, font, pageHeightPt, maxHeightPt) {
  const lineHeightPt = fontSize * 1.35;
  const maxLines = maxHeightPt ? Math.floor(maxHeightPt / lineHeightPt) : 200;
  // Simple word wrap
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const chunks = word.split('\n');
    for (let ci = 0; ci < chunks.length; ci++) {
      const testLine = cur ? `${cur} ${chunks[ci]}` : chunks[ci];
      const w = font.widthOfTextAtSize(testLine, fontSize);
      if (w > maxWidthPt && cur) {
        lines.push(cur);
        cur = chunks[ci];
      } else {
        cur = testLine;
      }
      if (ci < chunks.length - 1) { lines.push(cur); cur = ''; }
    }
  }
  if (cur) lines.push(cur);

  let drawY = y;
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    if (drawY < 0) break;
    page.drawText(lines[i] || ' ', {
      x: Math.max(0, x),
      y: Math.max(0, drawY),
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    drawY -= lineHeightPt;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { field_map, sample_data, template_file_url, offset_x = 0, offset_y = 0 } = await req.json();

    let pdfBytes;

    if (template_file_url) {
      // ── PATH A: Overlay on uploaded template ──────────────────────────────
      const resp = await fetch(template_file_url);
      const existingBytes = await resp.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width: pageWidthPt, height: pageHeightPt } = firstPage.getSize();

      for (const [fieldKey, fm] of Object.entries(field_map)) {
        if (fieldKey.startsWith('_')) continue;
        const value = sample_data[fieldKey];
        if (!value || !fm) continue;

        const rawX = (fm.x || 0) + offset_x;
        const rawY = (fm.y || 0) + offset_y;

        // Clamp to page bounds (mm)
        const clampedX = Math.max(0, Math.min(PAGE_W_MM - 5, rawX));
        const clampedY = Math.max(0, Math.min(PAGE_H_MM - 3, rawY));

        // Convert mm → pts, flip Y (PDF origin = bottom-left)
        const x = mmToPt(clampedX);
        const y = pageHeightPt - mmToPt(clampedY);
        const maxWidthPt = mmToPt(Math.min(fm.maxWidth || 180, PAGE_W_MM - clampedX));
        const fontSize = fm.fontSize || 10;

        if (fm.multiline) {
          const maxHeightPt = fm.maxHeight ? mmToPt(fm.maxHeight) : (pageHeightPt - y);
          wrapTextPdfLib(firstPage, value, x, y, maxWidthPt, fontSize, helvetica, pageHeightPt, maxHeightPt);
        } else {
          const clipped = String(value).substring(0, 200);
          firstPage.drawText(clipped, {
            x,
            y: Math.max(0, y),
            size: fontSize,
            font: helvetica,
            color: rgb(0.1, 0.1, 0.8),
            maxWidth: maxWidthPt,
          });
        }
      }

      pdfBytes = await pdfDoc.save();

    } else {
      // ── PATH B: Built-in NHAR form via jsPDF ──────────────────────────────
      const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });

      // Draw form skeleton
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

      // Overlay sample data
      doc.setTextColor(0, 0, 200);

      for (const [fieldKey, fm] of Object.entries(field_map)) {
        if (fieldKey.startsWith('_')) continue;
        const value = sample_data[fieldKey];
        if (!value || !fm) continue;

        const rawX = (fm.x || 0) + offset_x;
        const rawY = (fm.y || 0) + offset_y;

        // Clamp to page
        const x = Math.max(0, Math.min(PAGE_W_MM - 5, rawX));
        const y = Math.max(5, Math.min(PAGE_H_MM - 3, rawY));
        const maxWidth = Math.min(fm.maxWidth || 180, PAGE_W_MM - x);
        const fontSize = fm.fontSize || 10;

        doc.setFontSize(fontSize);

        if (fm.multiline) {
          wrapTextJsPDF(doc, value, x, y, maxWidth, fontSize, fontSize * 0.45, fm.maxHeight || 130);
        } else {
          doc.text(String(value), x, y, { maxWidth });
        }
      }

      const pdfB64 = doc.output('datauristring').split(',')[1];
      const binaryStr = atob(pdfB64);
      pdfBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) pdfBytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload and return URL
    const blob = new File([pdfBytes], `preview_${Date.now()}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    return Response.json({ file_url });

  } catch (error) {
    console.error('[previewFieldMap]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});