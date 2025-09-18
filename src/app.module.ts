import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelloModule } from './hello/hello.module';
import { AuthModule } from './auth/auth.module';
import { PatientModule } from './patient/patient.module';

import { User } from './entities/user.entity';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';

@Module({
  imports: [
    // Global config (env variables)
    ConfigModule.forRoot({ isGlobal: true }),

    // Database config
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'aryan512',
      database: process.env.DB_NAME ?? 'internship_db',
      entities: [User, Patient, Doctor],
      synchronize: true, // ❗ Turn off in production
    }),

    // Feature modules
    HelloModule,
    AuthModule,
    PatientModule,
  ],
  controllers: [], // AppController removed
  providers: [],   // AppService removed
})
export class AppModule {}
