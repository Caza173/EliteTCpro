import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, auto_send_email = false, email_to = null } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    // Fetch transaction
    const txs = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!txs || txs.length === 0) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = txs[0];

    // Check if portal access already exists
    const existing = await base44.entities.PortalAccess.filter({ transaction_id });
    
    if (existing && existing.length > 0) {
      // Already exists, return it
      const portalAccess = existing[0];
      
      // Optionally send email
      if (auto_send_email && email_to) {
        const portalLink = `${Deno.env.get('BASE44_APP_URL') || 'https://app.elitetc.io'}/#/portal-access`;
        await base44.integrations.Core.SendEmail({
          to: email_to,
          subject: "Access Your Transaction Portal",
          body: `<p>You can view your transaction details using the secure portal below.</p>
<p><strong>Portal Code:</strong> <span style="font-family: monospace; font-size: 16px; letter-spacing: 2px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${portalAccess.code}</span></p>
<p><strong>Access Link:</strong><br />
<a href="${portalLink}" style="color: #2563EB; text-decoration: none;">Open Transaction Portal</a></p>
<p style="color: #666; font-size: 13px;">If you have issues, reply to this email.</p>`,
        });

        await base44.entities.PortalAccess.update(portalAccess.id, {
          last_sent_at: new Date().toISOString(),
          last_sent_to: email_to,
        });
      }

      return Response.json({ portal_access: portalAccess, created: false });
    }

    // Create new portal access
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const portalAccess = await base44.entities.PortalAccess.create({
      code,
      transaction_id,
      brokerage_id: transaction.brokerage_id,
      enabled: true,
      created_by: user.email,
    });

    // Optionally send email
    if (auto_send_email && email_to) {
      const portalLink = `${Deno.env.get('BASE44_APP_URL') || 'https://app.elitetc.io'}/#/portal-access`;
      await base44.integrations.Core.SendEmail({
        to: email_to,
        subject: "Access Your Transaction Portal",
        body: `<p>You can view your transaction details using the secure portal below.</p>
<p><strong>Portal Code:</strong> <span style="font-family: monospace; font-size: 16px; letter-spacing: 2px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${code}</span></p>
<p><strong>Access Link:</strong><br />
<a href="${portalLink}" style="color: #2563EB; text-decoration: none;">Open Transaction Portal</a></p>
<p style="color: #666; font-size: 13px;">If you have issues, reply to this email.</p>`,
      });

      await base44.entities.PortalAccess.update(portalAccess.id, {
        last_sent_at: new Date().toISOString(),
        last_sent_to: email_to,
      });
    }

    return Response.json({ portal_access: portalAccess, created: true });
  } catch (error) {
    console.error("Portal access init error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});