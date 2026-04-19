import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate limiter: ip -> [timestamps]
const submissionLog = new Map();

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'live.com', 'msn.com', 'protonmail.com', 'mail.com',
]);

function isRateLimited(ip) {
  const now = Date.now();
  const entries = (submissionLog.get(ip) || []).filter(t => now - t < 3600_000);
  if (entries.length >= 5) return true;
  entries.push(now);
  submissionLog.set(ip, entries);
  return false;
}

function isGenericEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  return domain ? GENERIC_DOMAINS.has(domain) : false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // ── Honeypot check ──────────────────────────────────────────────────────
    if (body._honey && body._honey.trim() !== '') {
      // Silently accept but don't process — looks real to bots
      return Response.json({ success: true, submission_id: 'bot-rejected' });
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    if (isRateLimited(ip)) {
      return Response.json({
        error: 'Too many submissions from your location. Please try again in an hour.',
      }, { status: 429 });
    }

    const {
      deal_type,
      form_data,
      buyers = [],
      sellers = [],
      client_emails = [],
      agent_name,
      agent_email,
      agent_phone,
      property_address,
      document_url,
      document_name,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!deal_type) return Response.json({ error: 'Deal type is required' }, { status: 400 });
    if (!agent_email) return Response.json({ error: 'Agent email is required' }, { status: 400 });
    if (!agent_phone) return Response.json({ error: 'Agent phone is required' }, { status: 400 });
    if (!document_url && deal_type !== 'buyer_agency') {
      return Response.json({ error: 'A signed document upload is required' }, { status: 400 });
    }

    // ── Resolve brokerage ───────────────────────────────────────────────────
    const brokerages = await base44.asServiceRole.entities.Brokerage.list();
    const brokerage_id = brokerages[0]?.id;

    // ── Create IntakeSubmission ─────────────────────────────────────────────
    const submission = await base44.asServiceRole.entities.IntakeSubmission.create({
      brokerage_id,
      deal_type,
      form_data: form_data || {},
      buyers,
      sellers,
      client_emails,
      agent_name,
      agent_email: agent_email.toLowerCase().trim(),
      agent_phone,
      property_address,
      document_url: document_url || null,
      document_name: document_name || null,
      status: 'pending_review',
      email_verified: true, // OTP was verified before reaching here
      is_generic_email: isGenericEmail(agent_email),
      submitter_ip: ip,
      submitted_at: new Date().toISOString(),
    });

    // ── Notify ALL TCs and admins about the new submission ──────────────────
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const notifyUsers = allUsers.filter(u => ['tc', 'tc_lead', 'admin', 'owner'].includes(u.role));
      const genericWarning = isGenericEmail(agent_email)
        ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
            ⚠️ <strong>Unverified Agent Email</strong> — This submission used a generic email domain (${agent_email.split('@')[1]}). Review carefully.
          </div>`
        : '';
      const emailBody = `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;margin:0 0 16px;">New Deal Intake Submission</h2>
          ${genericWarning}
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;width:40%;">Deal Type</td><td style="color:#0f172a;font-weight:600;">${deal_type}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Agent</td><td style="color:#0f172a;font-weight:600;">${agent_name || '—'}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Agent Email</td><td style="color:#0f172a;">${agent_email}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Phone</td><td style="color:#0f172a;">${agent_phone}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Property</td><td style="color:#0f172a;font-weight:600;">${property_address || '—'}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Document</td><td style="color:#0f172a;">${document_url ? `<a href="${document_url}">View Document</a>` : 'None'}</td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Log in to EliteTC to review, approve, and claim this deal.</p>
        </div>
      `;
      await Promise.allSettled(notifyUsers.map(u =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          from_name: 'EliteTC Intake',
          subject: `New Deal Submission — ${property_address || 'Pending Review'}${isGenericEmail(agent_email) ? ' ⚠️' : ''}`,
          body: emailBody,
        })
      ));
    } catch (_) {}

    return Response.json({ success: true, submission_id: submission.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});