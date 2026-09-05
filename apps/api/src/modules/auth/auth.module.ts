import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PortalAuthGuard } from './guards/portal-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PortalAuthGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, PortalAuthGuard],
})
export class AuthModule {}
