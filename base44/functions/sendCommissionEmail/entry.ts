import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, htmlBody, pdfBase64, pdfFileName } = await req.json();
    if (!to || !subject || !htmlBody) {
      return Response.json({ error: 'Missing required fields: to, subject, htmlBody' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build MIME message with optional PDF attachment
    const boundary = `boundary_${Date.now()}`;
    let mime = [
      `MIME-Version: 1.0`,
      `To: ${to}`,
      `Subject: ${subject}`,
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

    // Base64url encode the MIME message
    const encoded = btoa(unescape(encodeURIComponent(mime)))
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
    return Response.json({ success: true, messageId: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});