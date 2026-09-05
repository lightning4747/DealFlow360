import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { OrderBifurcationService } from './order-bifurcation.service';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    OrderBifurcationService,
    ScheduleGeneratorService,
  ],
  exports: [
    BillingService,
    OrderBifurcationService,
    ScheduleGeneratorService,
  ],
})
export class BillingModule {}
