/**
 * sendInvoiceEmail — Sends an invoice to a client via email and marks it as sent.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Format currency
    const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Build line items HTML
    const lineItemsHtml = (invoice.line_items || []).map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${item.description || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity || 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(item.unit_price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(item.amount)}</td>
      </tr>
    `).join('');

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#0F172A;padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Invoice</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">${invoice.invoice_number || `INV-${invoice_id.slice(-6).toUpperCase()}`}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:32px;gap:24px;flex-wrap:wrap;">
        <div>
          <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Billed To</p>
          <p style="color:#0f172a;font-weight:600;margin:0 0 2px;">${invoice.client_name}</p>
          <p style="color:#64748b;margin:0;">${invoice.client_email}</p>
          ${invoice.property_address ? `<p style="color:#64748b;margin:4px 0 0;font-size:13px;">${invoice.property_address}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Invoice Details</p>
          <p style="color:#0f172a;margin:0 0 2px;font-size:13px;">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          ${invoice.due_date ? `<p style="color:#dc2626;font-weight:600;margin:2px 0 0;font-size:13px;">Due: ${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
        </div>
      </div>

      <!-- Line Items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Unit Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>

      <!-- Totals -->
      <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-left:auto;max-width:240px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#64748b;">
          <span>Subtotal</span><span>${fmt(invoice.subtotal)}</span>
        </div>
        ${invoice.tax_rate > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#64748b;">
          <span>Tax (${invoice.tax_rate}%)</span><span>${fmt(invoice.tax_amount)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:4px;">
          <span>Total</span><span>${fmt(invoice.total)}</span>
        </div>
      </div>

      ${invoice.notes ? `
      <div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid #2563eb;">
        <p style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin:0 0 6px;">Notes</p>
        <p style="color:#0f172a;font-size:14px;margin:0;">${invoice.notes}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Sent via EliteTC · Transaction Coordination Platform</p>
      ${invoice.agent_name ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">From: ${invoice.agent_name}</p>` : ''}
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number || `INV-${invoice_id.slice(-6).toUpperCase()}`} — ${fmt(invoice.total)}`,
      body: emailBody,
    });

    // Mark as sent
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[sendInvoiceEmail] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});