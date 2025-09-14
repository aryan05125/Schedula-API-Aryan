import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async createUserFromGoogle(profile: { emails: any[]; displayName: string }, role: 'doctor' | 'patient') {
    const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    if (!email) throw new BadRequestException('Google profile has no email');

    const user = this.userRepo.create({
      email,
      name: profile.displayName || 'Unknown',
      provider: 'google',
      password: null,
      role,
    });

    return this.userRepo.save(user);
  }

  async findOrCreateFromGoogle(profile: { emails: any[]; displayName: string }, role: 'doctor' | 'patient') {
    const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    if (!email) throw new BadRequestException('Google profile has no email');

    let user = await this.findByEmail(email);
    if (!user) {
      user = await this.createUserFromGoogle(profile, role);
    } else {
      // ensure role set (you may want to allow role update rules)
      if (!user.role) {
        user.role = role;
        await this.userRepo.save(user);
      }
    }
    return user;
  }

  getJwtForUser(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
