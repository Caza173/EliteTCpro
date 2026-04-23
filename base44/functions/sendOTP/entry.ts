import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entity to store OTP records: { email, code, expiresAt, attempts }
const OTP_ENTITY = 'OTPVerification';

// Rate limiting is per-IP-email combo; we'll query from entity if needed

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeCode(code) {
  return String(code)
    .normalize('NFKC')
    .replace(/[^A-Z0-9]/gi, '');
}

function buildMimeEmail({ to, subject, htmlBody, plainTextBody, fromName }) {
  const boundary = 'boundary_' + Date.now();
  const msg = [
    `From: ${fromName} <noreply@elitetc.app>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    plainTextBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
  ].join('\r\n');
  
  // Proper base64url encoding for RFC 4648
  const base64 = btoa(unescape(encodeURIComponent(msg)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendViaGmail(base44, { to, subject, plainTextBody, htmlBody }) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
  const raw = buildMimeEmail({ to, subject, plainTextBody, htmlBody, fromName: 'EliteTC Verification' });

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, code } = body;

    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalEmail = email.trim().toLowerCase();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // ── Send OTP ────────────────────────────────────────────────────────────
    if (action === 'send') {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

      // Delete old OTP for this email if exists
      const existing = await base44.asServiceRole.entities.OTPVerification.filter({ email: normalEmail });
      if (existing.length > 0) {
        await Promise.all(existing.map(r => base44.asServiceRole.entities.OTPVerification.delete(r.id)));
      }

      // Create new OTP record
      await base44.asServiceRole.entities.OTPVerification.create({
        email: normalEmail,
        code: otp,
        expiresAt,
        attempts: 0,
      });

      const cleanCode = sanitizeCode(otp);
      
      const plainTextBody = `Your verification code: ${cleanCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.`;
      
      const htmlBody = `<html><body style="font-family:Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:24px;">
<h2 style="color:#0f172a;margin:0 0 16px;">Verification Code</h2>
<p style="color:#475569;font-size:14px;margin:0 0 24px;">Use the code below to verify your email and complete your deal submission. It expires in 10 minutes.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
<p style="margin:0 0 12px;color:#475569;font-size:12px;">Your code:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:4px;color:#2563eb;margin:0;font-family:monospace;">${cleanCode}</p>
</div>
<p style="color:#94a3b8;font-size:12px;margin:0;">If you did not request this code, please ignore this email.</p>
</div>
</body></html>`;
      
      await sendViaGmail(base44, {
        to: normalEmail,
        subject: 'Your verification code - EliteTC Deal Intake',
        plainTextBody,
        htmlBody,
      });

      return Response.json({ sent: true });
    }

    // ── Verify OTP ──────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });

      const records = await base44.asServiceRole.entities.OTPVerification.filter({ email: normalEmail });
      if (records.length === 0) {
        return Response.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
      }

      const stored = records[0];
      if (new Date(stored.expiresAt) < new Date()) {
        await base44.asServiceRole.entities.OTPVerification.delete(stored.id);
        return Response.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        await base44.asServiceRole.entities.OTPVerification.delete(stored.id);
        return Response.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 });
      }

      if (stored.code !== code.trim()) {
        await base44.asServiceRole.entities.OTPVerification.update(stored.id, { attempts: stored.attempts + 1 });
        return Response.json({ error: `Incorrect code. ${5 - stored.attempts} attempt(s) remaining.` }, { status: 400 });
      }

      await base44.asServiceRole.entities.OTPVerification.delete(stored.id);
      return Response.json({ verified: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});