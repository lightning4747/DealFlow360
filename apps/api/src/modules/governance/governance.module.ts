import { Module } from '@nestjs/common';
import { BrsCalculationService } from './brs-calculator.service';
import { AuditLogService } from './audit-log.service';
import { ApprovalRoutingService } from './approval-routing.service';
import { GovernanceController } from './governance.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [GovernanceController],
  providers: [BrsCalculationService, AuditLogService, ApprovalRoutingService],
  exports: [BrsCalculationService, AuditLogService, ApprovalRoutingService],
})
export class GovernanceModule {}
