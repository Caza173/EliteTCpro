import { env } from '../../config/env.js';
import { getEmailProvider, type EmailSendRequest, type EmailSendResult } from './provider.js';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  const attempts = env.EMAIL_RETRY_ATTEMPTS;
  const normalizedRequest: EmailSendRequest = {
    ...request,
    text: request.text || (request.html ? stripHtml(request.html) : undefined),
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await provider.send(normalizedRequest);

      console.info(
        JSON.stringify({
          event: 'email.send.success',
          provider: result.provider,
          messageId: result.messageId,
          attempt,
          to: normalizedRequest.to,
          subject: normalizedRequest.subject,
          metadata: normalizedRequest.metadata ?? {},
        })
      );

      return result;
    } catch (error) {
      lastError = error;

      console.error(
        JSON.stringify({
          event: 'email.send.failure',
          provider: provider.name,
          attempt,
          to: normalizedRequest.to,
          subject: normalizedRequest.subject,
          metadata: normalizedRequest.metadata ?? {},
          error: error instanceof Error ? error.message : 'Unknown email error',
        })
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Email delivery failed');
}