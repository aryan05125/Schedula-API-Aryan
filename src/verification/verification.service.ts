import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Otp } from '../entities/otp.entity';
  import { RequestOtpDto } from './dto/request-otp.dto';
  import { ConfirmOtpDto } from './dto/confirm-otp.dto';
  import { Patient } from '../entities/patient.entity';
  
  @Injectable()
  export class VerificationService {
    constructor(
      @InjectRepository(Otp)
      private readonly otpRepo: Repository<Otp>,
      @InjectRepository(Patient)
      private readonly patientRepo: Repository<Patient>,
    ) {}
  
    private generateOtp(): string {
      return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    }
  
    async requestOtp(dto: RequestOtpDto) {
      let patient: Patient | null = null;
  
      if (dto.email) {
        patient = await this.patientRepo.findOne({ where: { email: dto.email } });
      } else if (dto.phone) {
        patient = await this.patientRepo.findOne({ where: { phone: dto.phone } });
      }
  
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
  
      const otpCode = this.generateOtp();
      const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
  
      const otp = this.otpRepo.create({
        otp: otpCode,
        email: dto.email ?? patient.email,
        phone: dto.phone ?? patient.phone,
        expiresAt: expiry,
        patient,
      });
  
      await this.otpRepo.save(otp);
  
      // TODO: send OTP via SMS/Email
      console.log(`OTP for ${otp.email} / ${otp.phone} is ${otpCode}`);
  
      return { message: 'OTP sent successfully' };
    }
  
    async confirmOtp(dto: ConfirmOtpDto) {
      const otp = await this.otpRepo.findOne({
        where: {
          email: dto.email ?? undefined,
          phone: dto.phone ?? undefined,
          otp: dto.otp,
        },
        relations: ['patient'],
      });
  
      if (!otp) {
        throw new BadRequestException('Invalid OTP');
      }
  
      if (otp.expiresAt < new Date()) {
        throw new BadRequestException('OTP expired');
      }
  
      otp.isVerified = true;
      await this.otpRepo.save(otp);
  
      return {
        message: 'Verification successful',
        patientId: otp.patient.id,
      };
    }
  }
  