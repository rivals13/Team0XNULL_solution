import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // max 3 registrations per minute per IP
  @ApiOperation({
    summary: 'Register a new account',
    description: 'Pass `role: MERCHANT` in the body to register as a merchant.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // max 5 login attempts per minute per IP
  @ApiOperation({ summary: 'Login and receive JWT access + refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@CurrentUser() user: any, @Body() _dto: RefreshTokenDto) {
    return this.authService.refreshTokens(user.sub, user.email, user.role);
  }

  // ─── Authenticated ─────────────────────────────────────────────────────────

  @Post('logout')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (invalidates session)' })
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  me(@CurrentUser() user: any) {
    return user;
  }

  // ─── Role-protected examples ───────────────────────────────────────────────

  @Get('merchant/profile')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: '[MERCHANT] Get merchant profile — requires MERCHANT or ADMIN role' })
  merchantProfile(@CurrentUser() user: any) {
    return user;
  }

  @Get('admin/users')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] List all users — requires ADMIN role' })
  async adminUsers() {
    const users = await this.usersService.findAll();
    return { users, total: users.length };
  }
}
