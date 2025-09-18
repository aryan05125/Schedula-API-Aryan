import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Otp } from '../entities/otp.entity';
import { Patient } from '../entities/patient.entity';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Otp, Patient])],
    providers: [VerificationService],
  controllers: [VerificationController],
})
export class VerificationModule {}
