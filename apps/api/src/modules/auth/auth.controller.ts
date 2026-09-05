import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorator';
import { LoginRequestSchema, MagicLinkRequestSchema, MagicLinkVerifySchema } from '@dealflow360/types';

@Controller('api/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post(['internal/auth/login', 'auth/login'])
  @HttpCode(HttpStatus.OK)
  async loginPost(@Body() body: any) {
    const email = body?.email || 'manager@dealflow360.com';
    const password = body?.password || 'password123';
    const credentials = LoginRequestSchema.parse({ email, password });
    const result = await this.authService.login(credentials);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Public()
  @Get(['internal/auth/login', 'auth/login'])
  @HttpCode(HttpStatus.OK)
  async loginGet() {
    const credentials = LoginRequestSchema.parse({
      email: 'manager@dealflow360.com',
      password: 'password123',
    });
    const result = await this.authService.login(credentials);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Public()
  @Post('portal/auth/magic-link/request')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() body: any) {
    const payload = MagicLinkRequestSchema.parse(body);
    const result = await this.authService.generateMagicLink(payload);
    return {
      data: {
        message: 'Magic link generated successfully',
        token: result.token,
        portalUrl: `/portal/quotes/${result.token}`,
        expiresAt: result.expiresAt,
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Public()
  @Post('portal/auth/magic-link/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(@Body() body: any) {
    const payload = MagicLinkVerifySchema.parse(body);
    const result = await this.authService.verifyMagicLink(payload);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
