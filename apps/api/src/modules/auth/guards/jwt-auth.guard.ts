import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { JwtPayload } from '@dealflow360/types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.df360_access;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : cookieToken;

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing',
        statusCode: 401,
      });
    }

    // Attach decoded token claim (validation handled by service/Better Auth)
    request.user = this.extractPayload(token);
    return true;
  }

  private extractPayload(token: string): Partial<JwtPayload> {
    try {
      const base64Payload = token.split('.')[1];
      const payloadBuffer = Buffer.from(base64Payload, 'base64');
      return JSON.parse(payloadBuffer.toString());
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid JWT structure',
        statusCode: 401,
      });
    }
  }
}
