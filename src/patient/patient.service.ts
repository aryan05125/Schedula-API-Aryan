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
}
