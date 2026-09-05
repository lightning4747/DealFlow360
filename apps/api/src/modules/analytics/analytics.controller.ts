import { Controller, Get, Query, Headers, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { StalledDealsService } from './stalled-deals.service';
import { QueryAnalyticsDtoSchema } from '@dealflow360/types';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly anomalyService: AnomalyDetectionService,
    private readonly stalledDealsService: StalledDealsService,
  ) {}

  @Get('deal-health')
  async getDealHealth(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Query() rawQuery: any,
  ) {
    const tenantId = tenantIdHeader || '00000000-0000-0000-0000-000000000001';
    const parsed = QueryAnalyticsDtoSchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.analyticsService.getDealHealthSummary(tenantId, parsed.data);
  }

  @Get('velocity')
  async getVelocity(@Headers('x-tenant-id') tenantIdHeader: string) {
    const tenantId = tenantIdHeader || '00000000-0000-0000-0000-000000000001';
    return this.analyticsService.getDealVelocityMetrics(tenantId);
  }

  @Get('anomalies/discount')
  async getDiscountAnomalies(
    @Query('repId') repId?: string,
    @Query('discountPct') discountPct?: string,
    @Query('category') category?: string,
  ) {
    if (repId && discountPct !== undefined) {
      return this.anomalyService.evaluateDiscountAnomaly(repId, parseFloat(discountPct), category);
    }
    return this.anomalyService.getActiveDiscountAnomalies();
  }

  @Get('stalled-deals')
  async getStalledDeals(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Query('thresholdDays') thresholdDays?: string,
  ) {
    const tenantId = tenantIdHeader || '00000000-0000-0000-0000-000000000001';
    const days = thresholdDays ? parseInt(thresholdDays, 10) : 7;
    return this.stalledDealsService.findStalledDeals(days, tenantId);
  }
}
