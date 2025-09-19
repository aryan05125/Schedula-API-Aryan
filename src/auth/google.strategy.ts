import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || '', // fallback empty string
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['profile', 'email'],
      passReqToCallback: true, // so we can read req.query.role or state
    } as StrategyOptionsWithRequest); // cast for TS
  }

  // passReqToCallback = true => first param is req
  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    try {
      // role is passed via state (?state=doctor) OR req.query.role
      const roleQuery =
        (req && req.query && req.query.role) ||
        (req && req.query && req.query.state);
      let role: 'doctor' | 'patient' = 'patient';
      if (roleQuery && roleQuery === 'doctor') role = 'doctor';

      // Use AuthService to find/create user
      const user = await this.authService.findOrCreateFromGoogle(profile, role);
      const token = this.authService.getJwtForUser(user);

      // return object accessible as req.user
      return done(null, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      return done(err, false);
    }
  }
}
