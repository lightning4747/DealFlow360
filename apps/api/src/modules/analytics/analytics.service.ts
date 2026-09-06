import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@dealflow360/database';
import { DRIZZLE_DB } from '../database/database.module';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { StalledDealsService } from './stalled-deals.service';
import { DealHealthSummaryDto, DealVelocityMetricsDto, QueryAnalyticsDto } from '@dealflow360/types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(AnomalyDetectionService)
    private readonly anomalyService: AnomalyDetectionService,
    @Inject(StalledDealsService)
    private readonly stalledDealsService: StalledDealsService,
  ) {}

  /**
   * Builds an aggregated Deal Health Summary for a tenant, including:
   * - Overall health score (0-100)
   * - Active quotes count
   * - Stalled deals and discount anomalies list
   */
  async getDealHealthSummary(tenantId: string, query?: QueryAnalyticsDto): Promise<DealHealthSummaryDto> {
    const thresholdDays = query?.stalledThresholdDays ?? 7;

    const [stalledDeals, discountAnomalies] = await Promise.all([
      this.stalledDealsService.findStalledDeals(thresholdDays, tenantId),
      this.anomalyService.getActiveDiscountAnomalies(),
    ]);

    const countRes: any = await this.db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM sales.quotes
      WHERE status NOT IN ('fulfilled', 'cancelled')
    `);
    const rows = countRes.rows || (Array.isArray(countRes) ? countRes : []);
    const activeQuotesCount = Number(rows[0]?.count || 0);

    let score = 100;
    if (activeQuotesCount > 0) {
      const stalledRatio = stalledDeals.length / activeQuotesCount;
      score -= Math.round(stalledRatio * 40); // Max 40 pt deduction for stalled ratio
    }
    const criticalCount = discountAnomalies.filter((a) => a.severity === 'CRITICAL').length;
    const warningCount = discountAnomalies.filter((a) => a.severity === 'WARNING').length;
    score -= Math.min(30, criticalCount * 3 + warningCount * 1.5); // Max 30 pt deduction for anomalies
    const overallScore = Math.max(30, Math.min(100, Math.round(score)));

    return {
      tenantId,
      overallScore,
      activeQuotesCount,
      stalledDealsCount: stalledDeals.length,
      anomaliesDetectedCount: discountAnomalies.length,
      stalledDeals,
      discountAnomalies,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves hourly/daily quote velocity and conversion metrics
   */
  async getDealVelocityMetrics(tenantId: string): Promise<DealVelocityMetricsDto[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          date_trunc('hour', created_at) as time_bucket,
          COUNT(*) FILTER (WHERE event_type = 'QUOTE_CREATED')::int as quote_creations,
          COUNT(*) FILTER (WHERE event_type = 'QUOTE_APPROVED')::int as quote_approvals,
          COUNT(*) FILTER (WHERE event_type = 'QUOTE_CONVERTED')::int as quote_conversions
        FROM analytics.quote_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', created_at)
        ORDER BY time_bucket ASC;
      `);

      return (result.rows || []).map((row: any) => ({
        timeBucket: new Date(row.time_bucket).toISOString(),
        quoteCreations: Number(row.quote_creations || 0),
        quoteApprovals: Number(row.quote_approvals || 0),
        quoteConversions: Number(row.quote_conversions || 0),
        averageCycleHours: 4.5,
      }));
    } catch (err: any) {
      this.logger.error(`Could not load velocity metrics: ${err.message}`);
      throw new InternalServerErrorException('Analytics velocity data is unavailable');
    }
  }

  /**
   * Record a rep discount entry for tracking
   */
  async recordRepDiscount(repId: string, quoteId: string, category: string, discountPct: number, tierCeilingPct: number) {
    try {
      await this.db.execute(sql`
        INSERT INTO analytics.rep_discount_tracking (rep_id, quote_id, category, applied_discount_pct, tier_ceiling_pct, time)
        VALUES (${repId}, ${quoteId}, ${category}, ${discountPct}, ${tierCeilingPct}, NOW())
      `);
    } catch (err: any) {
      this.logger.error(`Error recording rep discount: ${err.message}`);
      throw new InternalServerErrorException('Discount analytics data is unavailable');
    }
  }
}
