import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorator';
import { LoginRequestSchema, SignupRequestSchema, MagicLinkRequestSchema, MagicLinkVerifySchema } from '@dealflow360/types';

@Controller('api/v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post(['internal/auth/login', 'auth/login'])
  @HttpCode(HttpStatus.OK)
  async loginPost(@Body() body: any) {
    const credentials = LoginRequestSchema.parse(body);
    const result = await this.authService.login(credentials);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    };
  }

  @Public()
  @Post(['internal/auth/signup', 'auth/signup'])
  @HttpCode(HttpStatus.CREATED)
  async signupPost(@Body() body: any) {
    const payload = SignupRequestSchema.parse(body);
    const result = await this.authService.signup(payload);
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
