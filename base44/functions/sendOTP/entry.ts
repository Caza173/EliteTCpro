import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// In-memory OTP store: email -> { code, expiresAt, attempts }
const otpStore = new Map();

// Rate limiter: key -> [timestamps]
const sendLog = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const entries = (sendLog.get(key) || []).filter(t => now - t < 3600_000);
  if (entries.length >= 10) return true;
  entries.push(now);
  sendLog.set(key, entries);
  return false;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
      const rateLimitKey = `${ip}:${normalEmail}`;
      if (isRateLimited(rateLimitKey)) {
        return Response.json({ error: 'Too many OTP requests. Please wait before trying again.' }, { status: 429 });
      }

      const otp = generateOTP();
      otpStore.set(normalEmail, {
        code: otp,
        expiresAt: Date.now() + 10 * 60_000, // 10 minutes
        attempts: 0,
      });

      await base44.integrations.Core.SendEmail({
        to: normalEmail,
        from_name: 'EliteTC Verification',
        subject: 'Your verification code — EliteTC Deal Intake',
        body: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#0f172a;margin:0 0 8px;">Verification Code</h2>
            <p style="color:#475569;font-size:14px;margin:0 0 24px;">Use the code below to verify your email and complete your deal submission. It expires in 10 minutes.</p>
            <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0;">If you did not request this code, please ignore this email.</p>
          </div>
        `,
      });

      return Response.json({ sent: true });
    }

    // ── Verify OTP ──────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });

      const stored = otpStore.get(normalEmail);
      if (!stored) {
        return Response.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(normalEmail);
        return Response.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
      }

      stored.attempts += 1;
      if (stored.attempts > 5) {
        otpStore.delete(normalEmail);
        return Response.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 });
      }

      if (stored.code !== code.trim()) {
        return Response.json({ error: `Incorrect code. ${5 - stored.attempts} attempt(s) remaining.` }, { status: 400 });
      }

      otpStore.delete(normalEmail);
      return Response.json({ verified: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});