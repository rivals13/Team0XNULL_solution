import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { SecureLoggerService } from '../common/logger/secure-logger.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OtpService } from '../sms/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new SecureLoggerService(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      ...dto,
      password: passwordHash,
      role: dto.role ?? UserRole.USER,
    });

    // Auto-send OTP if the user registered with a phone number
    if (user.phone) {
      this.otpService.sendOtp(user.phone).catch((err) =>
        this.logger.warn(`OTP send failed for ${user.phone}: ${err.message}`),
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.logger.log(`New ${user.role} registered: ${this.logger.sanitize(user.email)}`);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      otpSent: !!user.phone,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.logger.log(`${user.role} logged in: ${this.logger.sanitize(user.email)}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, email: string, role: UserRole) {
    return this.generateTokens(userId, email, role);
  }

  async logout(userId: string) {
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
