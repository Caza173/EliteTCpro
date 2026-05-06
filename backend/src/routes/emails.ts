import { and, eq, inArray } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { documents, transactions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction } from '../middleware/ownership.js';
import { sendEmail } from '../services/email/index.js';

const router = Router();

function buildFinancialCommitmentBody(transaction: Record<string, unknown>, currentUser: { email: string; fullName?: string | null }) {
  const buyerFirst = Array.isArray(transaction.buyers) && transaction.buyers.length > 0
    ? transaction.buyers[0]
    : typeof transaction.buyer === 'string'
      ? transaction.buyer.split(' ')[0]
      : 'Buyer';
  const address = String(transaction.address || 'your property');
  const closingDate = transaction.closing_date
    ? new Date(String(transaction.closing_date)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '[Closing Date]';
  const tcName = currentUser.fullName || currentUser.email || 'Your Transaction Coordinator';
  const teamName = String(transaction.agent_company || 'EliteTC');

  return `Hi ${buyerFirst},

Your financial commitment has been received for ${address}.

This satisfies the financing contingency in your contract.

What this means:
- Financing is approved per contract terms
- We are clear to move toward closing
- No further action needed on the financing contingency

Next steps:
- Your lender will finalize any remaining conditions
- Title and closing coordination will continue
- We will schedule your final walkthrough closer to closing

Your closing is currently scheduled for ${closingDate}.

If you have any questions, feel free to reach out.

– ${tcName}
Transaction Coordinator
${teamName}`;
}

const sendPayloadSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1),
  body: z.string().optional(),
  htmlBody: z.string().optional(),
  transaction_id: z.string().uuid().optional(),
  attachment_document_ids: z.array(z.string().uuid()).optional(),
});

router.use(requireAuth);

router.post('/send', async (request, response) => {
  const payload = sendPayloadSchema.parse(request.body ?? {});
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];
  const cc = payload.cc ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc]) : [];

  let attachmentLinks = '';
  if (payload.transaction_id) {
    const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }

    if (payload.attachment_document_ids && payload.attachment_document_ids.length > 0) {
      const ownedDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.ownerId, request.user.id),
            eq(documents.transactionId, payload.transaction_id),
            inArray(documents.id, payload.attachment_document_ids)
          )
        );

      if (ownedDocuments.length > 0) {
        attachmentLinks = `\n\nDocuments:\n${ownedDocuments.map((document) => `- ${document.fileName}: ${document.fileUrl}`).join('\n')}`;
      }
    }
  }

  const finalBody = payload.body ? `${payload.body}${attachmentLinks}` : payload.body;
  const finalHtmlBody = payload.htmlBody
    ? `${payload.htmlBody}${attachmentLinks ? `<hr/><p><strong>Documents</strong><br/>${attachmentLinks.replace(/\n/g, '<br/>')}</p>` : ''}`
    : undefined;

  const result = await sendEmail({
    to,
    cc,
    subject: payload.subject,
    text: finalBody,
    html: finalHtmlBody,
    metadata: {
      transactionId: payload.transaction_id || null,
      actorEmail: request.user.email,
      workflow: 'generic-email-send',
    },
  });

  return response.json({ success: true, sent: to.length, message_id: result.messageId });
});

router.post('/financial-commitment', async (request, response) => {
  const payload = z.object({ transaction_id: z.string().uuid(), body_override: z.string().nullable().optional() }).parse(request.body ?? {});

  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const serialized = {
    ...transaction.data,
    id: transaction.id,
    address: transaction.address,
    status: transaction.status,
  } as Record<string, unknown>;
  const buyerEmail = Array.isArray(serialized.client_emails) && serialized.client_emails.length > 0
    ? String(serialized.client_emails[0])
    : typeof serialized.client_email === 'string'
      ? serialized.client_email
      : '';

  const missing: string[] = [];
  if (!buyerEmail) missing.push('Buyer email');
  if (!serialized.address) missing.push('Property address');
  if (!serialized.closing_date) missing.push('Closing date');
  if (!(Array.isArray(serialized.buyers) && serialized.buyers[0]) && !serialized.buyer) missing.push('Buyer first name');
  if (missing.length > 0) {
    return response.status(422).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const emailBody = payload.body_override || buildFinancialCommitmentBody(serialized, { email: request.user.email, fullName: request.user.fullName || null });

  await sendEmail({
    to: [buyerEmail],
    cc: request.user.email !== buyerEmail ? [request.user.email] : [],
    subject: 'Financial Commitment Received',
    text: emailBody,
    metadata: {
      transactionId: payload.transaction_id,
      actorEmail: request.user.email,
      workflow: 'financial-commitment-email',
    },
  });

  const nextData = {
    ...transaction.data,
    financing_contingency_status: 'cleared',
    transaction_phase: 'clear_to_close',
    risk_level: 'on_track',
    health_score: Math.min(100, Number(transaction.data.health_score || 75) + 15),
    last_activity_at: new Date().toISOString(),
  };

  await db
    .update(transactions)
    .set({
      data: nextData,
    })
    .where(and(eq(transactions.id, transaction.id), eq(transactions.ownerId, request.user.id)));

  return response.json({
    success: true,
    sent_to: buyerEmail,
    actions: ['financing_contingency_cleared', 'phase_updated_to_clear_to_close'],
  });
});

export default router;