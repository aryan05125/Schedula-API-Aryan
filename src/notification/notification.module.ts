// src/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationService, EmailService, SmsService],
  controllers: [NotificationController],
  exports: [NotificationService, EmailService, SmsService],
})
export class NotificationModule {}
