import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * ✅ Create notification + optionally send Email and SMS (with appointment details)
   */
  async createNotification(data: {
    userId: string | number;
    type: string;
    message: string;
    email?: string;
    phoneNumber?: string;
    sendEmail?: boolean;
    sendSms?: boolean;
    appointmentDetails?: {
      appointmentId?: string;
      doctorName?: string;
      patientName?: string;
      date?: string;
      reportingTime?: string;
    };
  }) {
    const normalizedUserId =
      typeof data.userId === 'string' ? data.userId : String(data.userId);

    // ✅ Create Notification Entity
    const notifEntity: Partial<Notification> = {
      userId: normalizedUserId,
      type: data.type,
      message: data.message,
      email: data.email ?? null,
      phoneNumber: data.phoneNumber ?? null,
      isRead: false,
      appointmentDetails: data.appointmentDetails ?? undefined,
      channel: this.getChannel(data),
    };

    const notif = this.notificationRepo.create(notifEntity);
    const saved = await this.notificationRepo.save(notif);

    // ✅ Send Email
    if (data.sendEmail && data.email) {
      try {
        let htmlBody = `<p>${data.message}</p>`;
        if (data.appointmentDetails) {
          htmlBody += `
            <h4>Appointment Details:</h4>
            <ul>
              <li><b>Doctor:</b> ${data.appointmentDetails.doctorName ?? '-'}</li>
              <li><b>Patient:</b> ${data.appointmentDetails.patientName ?? '-'}</li>
              <li><b>Date:</b> ${data.appointmentDetails.date ?? '-'}</li>
              <li><b>Time:</b> ${data.appointmentDetails.reportingTime ?? '-'}</li>
            </ul>`;
        }

        await this.emailService.sendEmail({
          to: data.email,
          subject: `Schedula Notification - ${data.type}`,
          html: htmlBody,
          text: data.message,
        });
      } catch (err) {
        this.logger.warn(`Email failed for ${data.email}: ${String(err)}`);
      }
    }

    // ✅ Send SMS
    if (data.sendSms && data.phoneNumber) {
      try {
        let smsMsg = `${data.message}`;
        if (data.appointmentDetails) {
          smsMsg += `\nDr. ${data.appointmentDetails.doctorName ?? ''} | ${data.appointmentDetails.date ?? ''} ${data.appointmentDetails.reportingTime ?? ''}`;
        }
        await this.smsService.sendSms(data.phoneNumber, smsMsg);
      } catch (err) {
        this.logger.warn(`SMS failed for ${data.phoneNumber}: ${String(err)}`);
      }
    }

    return saved;
  }

  /**
   * 🧠 Helper: Decide notification channel (typed array fix)
   */
  private getChannel(data: any): string {
    const channels: string[] = [];
    if (data.sendEmail) channels.push('email');
    if (data.sendSms) channels.push('sms');
    channels.push('in-app');
    return channels.join(', ');
  }

  /**
   * ✅ Get all notifications for a user
   */
  async getUserNotifications(userId: string) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ✅ Mark notification as read
   */
  async markAsRead(id: string) {
    await this.notificationRepo.update(id, { isRead: true });
    return this.notificationRepo.findOne({ where: { id } });
  }
}
