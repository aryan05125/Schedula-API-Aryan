import { Injectable } from '@nestjs/common';

@Injectable()
export class OnboardingService {
  getSteps() {
    return [
      { id: 1, title: 'Upload Profile Photo', completed: false },
      { id: 2, title: 'Fill Medical History', completed: false },
      { id: 3, title: 'Set Preferences', completed: false },
    ];
  }
}
