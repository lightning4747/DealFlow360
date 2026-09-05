import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorator';
import { UserRole } from '@dealflow360/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector = new Reflector()) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Access denied: insufficient permissions',
        statusCode: 403,
      });
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'ROLE_MISMATCH',
        message: `Role ${user.role} is not authorized for this resource`,
        statusCode: 403,
      });
    }

    return true;
  }
}
