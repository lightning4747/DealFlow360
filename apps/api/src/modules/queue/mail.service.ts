import { Injectable, ServiceUnavailableException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { EmailNotificationJobPayload } from './queue.types';

@Injectable()
export class MailService {
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(@Optional() config?: ConfigService) {
    const host = config?.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const user = config?.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const password = config?.get<string>('SMTP_PASSWORD') || process.env.SMTP_PASSWORD;
    if (!host || !user || !password) {
      this.from = user || '';
      return;
    }
    this.from = config?.get<string>('MAIL_FROM') || process.env.MAIL_FROM || user;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(config?.get<string>('SMTP_PORT') || process.env.SMTP_PORT || 587),
      secure: (config?.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE) === 'true',
      auth: { user, pass: password },
    });
  }

  async send(job: EmailNotificationJobPayload) {
    const subject = `${job.templateId.replace(/-/g, ' ')} - DealFlow360`;
    const variables = Object.entries(job.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    try {
      if (!this.transporter) {
        throw new Error('SMTP is not configured');
      }
      const result = await this.transporter.sendMail({
        from: this.from,
        to: job.to,
        subject,
        text: `Hello ${job.recipientName},\n\n${variables}`,
      });
      return { delivered: true, messageId: result.messageId, recipient: job.to };
    } catch (error) {
      throw new ServiceUnavailableException(`Email delivery failed: ${(error as Error).message}`);
    }
  }
}
