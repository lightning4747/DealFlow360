import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorator';
import { LoginRequestSchema, MagicLinkRequestSchema, MagicLinkVerifySchema } from '@dealflow360/types';

@Controller('api/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('internal/auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const credentials = LoginRequestSchema.parse(body);
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
      data: { message: 'Magic link generated successfully', expiresAt: result.expiresAt },
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
