// src/notification/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for Gmail SSL
        auth: { user, pass },
      });

      this.transporter.verify().then(
        () => this.logger.log('✅ SMTP transporter verified'),
        (err) => this.logger.warn('⚠️ SMTP verification failed: ' + String(err)),
      );
    } else {
      this.logger.warn('⚠️ SMTP not configured. EmailService will only log messages.');
    }
  }

  async sendEmail(payload: EmailPayload) {
    const { to, subject, html, text } = payload;

    if (!to) throw new Error('Email "to" field is required');

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: process.env.SMTP_FROM ?? `"Schedula" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html: html ?? text,
          text,
        });
        this.logger.log(`📧 Email sent successfully to ${to}. MessageId=${info.messageId}`);
        return { ok: true, info };
      } catch (err) {
        this.logger.error('❌ Email send failed: ' + String(err));
        return { ok: false, error: err };
      }
    }

    this.logger.log(`(LOG ONLY) Email to=${to}, subject=${subject}, text=${text}`);
    return { ok: true, info: 'logged-only' };
  }
}
