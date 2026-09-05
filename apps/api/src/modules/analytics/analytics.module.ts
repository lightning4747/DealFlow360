import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { StalledDealsService } from './stalled-deals.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnomalyDetectionService, StalledDealsService],
  exports: [AnalyticsService, AnomalyDetectionService, StalledDealsService],
})
export class AnalyticsModule {}
