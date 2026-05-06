import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export type EmailSendRequest = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  metadata?: Record<string, unknown>;
};

export type EmailSendResult = {
  provider: string;
  messageId: string;
};

export interface EmailProvider {
  readonly name: string;
  send(request: EmailSendRequest): Promise<EmailSendResult>;
}

function formatFromAddress(request: EmailSendRequest) {
  const fromEmail = request.fromEmail || env.EMAIL_FROM_EMAIL || 'no-reply@elitetc.local';
  const fromName = request.fromName || env.EMAIL_FROM_NAME;
  return `${fromName} <${fromEmail}>`;
}

export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    const messageId = `log-${Date.now()}`;

    console.info(
      JSON.stringify({
        event: 'email.send.simulated',
        provider: this.name,
        messageId,
        to: request.to,
        cc: request.cc ?? [],
        bcc: request.bcc ?? [],
        subject: request.subject,
        metadata: request.metadata ?? {},
      })
    );

    return { provider: this.name, messageId };
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';

  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: formatFromAddress(request),
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: request.subject,
      html: request.html,
      text: request.text,
    });

    return {
      provider: this.name,
      messageId: info.messageId,
    };
  }
}

export function getEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST && env.SMTP_PORT) {
    return new SmtpEmailProvider();
  }

  return new LogEmailProvider();
}