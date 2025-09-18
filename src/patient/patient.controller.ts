import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('api/v1/patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // 1. Registration
  @Post('register')
  async register(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.register(createPatientDto);
  }

  // 2. Request OTP
  @Post('verify/request')
  async requestOtp(@Body('email') email: string) {
    return this.patientService.requestOtp(email);
  }

  // 3. Confirm OTP
  @Post('verify/confirm')
  async confirmOtp(@Body() body: { email: string; otp: string }) {
    return this.patientService.confirmOtp(body.email, body.otp);
  }

  // 4. Onboarding Steps
  @Get('onboarding/steps')
  async getOnboardingSteps() {
    return this.patientService.getOnboardingSteps();
  }
}
