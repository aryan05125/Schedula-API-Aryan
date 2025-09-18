import { Body, Controller, Post } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';

@Controller('api/v1/verify')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.verificationService.requestOtp(dto);
  }

  @Post('confirm')
  async confirmOtp(@Body() dto: ConfirmOtpDto) {
    return this.verificationService.confirmOtp(dto);
  }
}
