// src/notification/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor() {
    // Currently a lightweight wrapper — implement provider init here (Twilio, etc.) if desired.
    if (process.env.SMS_PROVIDER === 'twilio') {
      this.logger.log('SMS provider set to twilio (please ensure you configured TWILIO_* env vars).');
    } else {
      this.logger.log('No SMS provider configured. SmsService will only log SMS messages.');
    }
  }

  async sendSms(to: string, message: string) {
    if (!to) throw new Error('SMS "to" required');

    // Example pluggable: Twilio placeholder (not implemented automatically)
    if (process.env.SMS_PROVIDER === 'twilio') {
      // Optionally implement Twilio send here using TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
      // For now: log and return success structure
      this.logger.log(`(TWILIO-PLACEHOLDER) SMS to=${to} message=${message}`);
      return { ok: true, provider: 'twilio', info: 'placeholder' };
    }

    // Default fallback: log SMS content
    this.logger.log(`(LOG ONLY) SMS to=${to}, message=${message}`);
    return { ok: true, info: 'logged-only' };
  }
}
