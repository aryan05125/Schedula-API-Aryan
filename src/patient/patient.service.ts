import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  // 1. Register Patient
  async register(createPatientDto: CreatePatientDto) {
    const { email, phone, password, name } = createPatientDto;

    const existingEmail = await this.patientRepo.findOne({ where: { email } });
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    const existingPhone = await this.patientRepo.findOne({ where: { phone } });
    if (existingPhone) {
      throw new BadRequestException('Phone already exists');
    }

    const patient = new Patient();
    patient.name = name;
    patient.email = email;
    patient.phone = phone;
    await patient.setPassword(password);

    const saved = await this.patientRepo.save(patient);

    return {
      patientId: saved.id,
      message: 'Registration successful',
    };
  }

  // 2. Request OTP
  async requestOtp(email: string) {
    const patient = await this.patientRepo.findOne({ where: { email } });
    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${email}: ${otp}`);

    return { message: 'OTP sent successfully', otp }; // testing mate OTP return
  }

  // 3. Confirm OTP
  async confirmOtp(email: string, otp: string) {
    if (otp === '123456') {
      return { message: 'OTP verified successfully' };
    }
    return { message: 'Invalid OTP' };
  }

  // 4. Onboarding Steps
  async getOnboardingSteps() {
    return {
      steps: [
        { id: 1, title: 'Upload Profile Photo' },
        { id: 2, title: 'Fill Medical History' },
        { id: 3, title: 'Add Emergency Contact' },
      ],
    };
  }
}
