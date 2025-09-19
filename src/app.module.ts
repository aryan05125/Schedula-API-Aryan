import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelloModule } from './hello/hello.module';
import { AuthModule } from './auth/auth.module';
import { PatientModule } from './patient/patient.module';
import { VerificationModule } from './verification/verification.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AppointmentModule } from './appointment/appointment.module';

import { User } from './entities/user.entity';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { Otp } from './entities/otp.entity';
import { Appointment } from './appointment/entities/appointment.entity';

@Module({
  imports: [
    // Global config (env variables)
    ConfigModule.forRoot({ isGlobal: true }),

    // Database config (Render PostgreSQL)
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // ✅ single connection string
      entities: [User, Patient, Doctor, Otp, Appointment],
      synchronize: true, // ⚠️ Disable in production, use migrations
      ssl: {
        rejectUnauthorized: false, // 👈 important for Render
      },
    }),

    // Feature modules
    HelloModule,
    AuthModule,
    PatientModule,
    VerificationModule,
    OnboardingModule,
    AppointmentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
