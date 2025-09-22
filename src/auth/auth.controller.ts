import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('api/v1/auth')
export class AuthController {
  // Start Google OAuth flow with role query param
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // This will redirect to Google automatically
  }

  // Google OAuth callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any): Promise<AuthResponseDto> {
    return req.user; // { token, user }
  }
}
