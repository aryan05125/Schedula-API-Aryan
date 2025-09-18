import { Body, Controller, Post } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('api/v1')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('register')
  async register(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.register(createPatientDto);
  }
}
