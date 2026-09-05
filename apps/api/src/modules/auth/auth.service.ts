import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginRequest, AuthTokenResponse, MagicLinkRequest, MagicLinkVerify } from '@dealflow360/types';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  // Better Auth & Dual-Token (JWT + Redis refresh) implementation stub
  async login(credentials: LoginRequest): Promise<AuthTokenResponse> {
    if (credentials.email === 'admin@dealflow360.com' && credentials.password === 'password123') {
      return {
        user: {
          id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          email: credentials.email,
          name: 'System Admin',
          role: 'admin',
        },
        tokens: {
          accessToken: 'header.payload.signature_access_token_stub',
          refreshToken: 'header.payload.signature_refresh_token_stub',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      };
    }
    throw new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      statusCode: 401,
    });
  }

  async generateMagicLink(req: MagicLinkRequest): Promise<{ token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { token, expiresAt };
  }

  async verifyMagicLink(verify: MagicLinkVerify): Promise<{ portalToken: string; quoteId: string }> {
    if (!verify.token || !verify.quoteId) {
      throw new UnauthorizedException({
        code: 'INVALID_MAGIC_LINK',
        message: 'Invalid or expired magic link token',
        statusCode: 401,
      });
    }
    return {
      portalToken: 'header.payload.signature_portal_token_stub',
      quoteId: verify.quoteId,
    };
  }
}
