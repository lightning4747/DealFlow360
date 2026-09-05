import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class PortalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-portal-token'] || request.cookies?.df360_portal;

    if (!token) {
      throw new UnauthorizedException({
        code: 'PORTAL_AUTH_REQUIRED',
        message: 'Customer portal authentication token required',
        statusCode: 401,
      });
    }

    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      if (payload.type !== 'portal') {
        throw new Error('Not a portal token');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_PORTAL_TOKEN',
        message: 'Invalid customer portal magic link session token',
        statusCode: 401,
      });
    }
  }
}
