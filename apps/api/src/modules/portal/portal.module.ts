import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { GovernanceModule } from '../governance/governance.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [GovernanceModule, BillingModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
