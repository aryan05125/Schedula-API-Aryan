import { Controller, Get } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('api/v1/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // GET /api/v1/onboarding/steps
  @Get('steps')
  getSteps() {
    return {
      success: true,
      steps: this.onboardingService.getSteps(),
    };
  }
}
