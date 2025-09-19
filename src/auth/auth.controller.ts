import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('api/v1/auth')
export class AuthController {
  // Initiates Google OAuth flow. Provide role as query param:
  // GET /api/v1/auth/google?role=doctor
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard will redirect to Google
  }

  // Callback route configured in Google console and in strategy
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any): Promise<AuthResponseDto> {
    // After successful OAuth, GoogleStrategy returned object as req.user
    // We return JSON { token, user }
    return req.user;
  }
}
