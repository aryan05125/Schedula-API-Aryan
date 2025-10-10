import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// ✅ Feature Modules
import { HelloModule } from './hello/hello.module';
import { AuthModule } from './auth/auth.module';
import { PatientModule } from './patient/patient.module';
import { VerificationModule } from './verification/verification.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AppointmentModule } from './appointment/appointment.module';
import { SlotModule } from './slot/slot.module';
import { NotificationModule } from './notification/notification.module';
import { WaitingListModule } from './waiting-list/waiting-list.module';

// ✅ Entities
import { User } from './entities/user.entity';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { Otp } from './entities/otp.entity';
import { Appointment } from './appointment/entities/appointment.entity';
import { Slot } from './slot/entities/slot.entity';
import { Notification } from './notification/notification.entity';
import { WaitingList } from './waiting-list/waiting-list.entity';

@Module({
  imports: [
    // 🌍 Global config (env variables)
    ConfigModule.forRoot({ isGlobal: true }),

    // 🗄️ Database config (Render PostgreSQL)
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // ✅ single connection string
      entities: [
        User,
        Patient,
        Doctor,
        Otp,
        Appointment,
        Slot,
        Notification,
        WaitingList,
      ],
      synchronize: true, // ⚠️ Disable in production, use migrations
      ssl: {
        rejectUnauthorized: false, // 👈 required for Render cloud DB
      },
    }),

    // ⚙️ Feature modules
    HelloModule,
    AuthModule,
    PatientModule,
    VerificationModule,
    OnboardingModule,
    AppointmentModule,
    SlotModule,
    NotificationModule,
    WaitingListModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
