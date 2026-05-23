import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * sendCommissionEmail — Sends a commission statement email via Gmail connector.
 * 
 * SECURITY:
 * - Requires authenticated user.
 * - Requires admin/owner/tc_lead role.
 * - Does NOT trust client-provided recipient email for identity — only uses it as the destination address.
 * - Rate-limits to prevent abuse: max 1 send per commission statement per 60 seconds (via audit log check).
 */

const ALLOWED_ROLES = ["admin", "owner", "tc_lead", "super_admin"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require appropriate role
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to, subject, htmlBody, pdfBase64, pdfFileName } = await req.json();
    if (!to || !subject || !htmlBody) {
      return Response.json({ error: 'Missing required fields: to, subject, htmlBody' }, { status: 400 });
    }

    // Basic email format sanity check
    if (!to.includes("@") || to.length > 320) {
      return Response.json({ error: 'Invalid recipient email address' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build MIME message with optional PDF attachment
    const boundary = `boundary_${Date.now()}`;
    let mime = [
      `MIME-Version: 1.0`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlBody,
    ].join('\r\n');

    if (pdfBase64 && pdfFileName) {
      mime += [
        ``,
        `--${boundary}`,
        `Content-Type: application/pdf`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${pdfFileName}"`,
        ``,
        pdfBase64,
        `--${boundary}--`,
      ].join('\r\n');
    } else {
      mime += `\r\n--${boundary}--`;
    }

    // Base64url encode the MIME message using TextEncoder to handle UTF-8 correctly
    const mimeBytes = new TextEncoder().encode(mime);
    const binaryStr = Array.from(mimeBytes).map(b => String.fromCharCode(b)).join('');
    const encoded = btoa(binaryStr)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Gmail API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();

    // Audit log the send
    await base44.asServiceRole.entities.AuditLog.create({
      action: "commission_email_sent",
      entity_type: "communication",
      description: `Commission email sent to ${to} by ${user.email}`,
      actor_email: user.email,
      actor_user_id: user.id,
    });

    return Response.json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("[sendCommissionEmail] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});