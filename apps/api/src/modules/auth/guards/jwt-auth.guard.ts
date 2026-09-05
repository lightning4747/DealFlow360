import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { JwtPayload } from '@dealflow360/types';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_dealflow360_change_in_production';

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
      if (process.env.NODE_ENV !== 'production') {
        // Transparent developer admin session in dev environment
        request.user = {
          id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          email: 'admin@dealflow360.com',
          name: 'System Administrator',
          role: 'admin',
        };
        return true;
      }
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing',
        statusCode: 401,
      });
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      request.user = decoded;
      return true;
    } catch (err: any) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: err.message || 'Invalid or expired token',
        statusCode: 401,
      });
    }
  }
}
