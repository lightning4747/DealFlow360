import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@dealflow360/database';
import { RepDiscountAnomalyDto, DealHealthAnomalySeverity } from '@dealflow360/types';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Evaluates if a given discount requested by a sales rep represents a statistical anomaly.
   * Standard Score formula: z = (x - mu) / sigma
   * Thresholds:
   *   z > 3.0 => CRITICAL
   *   z > 2.0 => WARNING
   *   else => NONE
   */
  async evaluateDiscountAnomaly(
    repId: string,
    currentDiscountPercentage: number,
    category?: string,
  ): Promise<RepDiscountAnomalyDto> {
    try {
      // Query 30-day historical mean and population standard deviation for this rep
      const statsQuery = await this.db.execute(sql`
        SELECT 
          COALESCE(AVG(applied_discount_pct), 0)::float as mean,
          COALESCE(STDDEV_POP(applied_discount_pct), 0)::float as stddev,
          COUNT(*)::int as count
        FROM analytics.rep_discount_tracking
        WHERE rep_id = ${repId}
          AND time >= NOW() - INTERVAL '30 days'
          ${category ? sql`AND category = ${category}` : sql``}
      `);

      const stats = statsQuery.rows[0] as { mean: number; stddev: number; count: number } | undefined;
      const mean = stats ? Number(stats.mean) : 0;
      const stddev = stats ? Number(stats.stddev) : 0;
      const count = stats ? Number(stats.count) : 0;

      let zScore = 0;
      let severity: DealHealthAnomalySeverity = 'NONE';
      let message = 'Discount within normal statistical range.';

      // If we have insufficient historical samples or zero variance, evaluate relative to baseline
      if (count < 3 || stddev === 0) {
        // Fallback default: if standard deviation is 0 but discount exceeds mean by > 15%, warn
        if (currentDiscountPercentage > mean + 15) {
          severity = 'WARNING';
          zScore = 2.1;
          message = `Discount exceeds rep 30-day average (${mean.toFixed(1)}%) by over 15% with limited variance history.`;
        } else {
          zScore = 0;
          severity = 'NONE';
          message = `Insufficient history (${count} quotes) for standard deviation anomaly calculation. Baseline mean: ${mean.toFixed(1)}%.`;
        }
      } else {
        zScore = Number(((currentDiscountPercentage - mean) / stddev).toFixed(2));

        if (zScore >= 3.0) {
          severity = 'CRITICAL';
          message = `Critical anomaly: Discount is ${zScore} standard deviations above rep 30-day mean (${mean.toFixed(1)}%, σ=${stddev.toFixed(1)}%).`;
        } else if (zScore >= 2.0) {
          severity = 'WARNING';
          message = `Warning: Discount is ${zScore} standard deviations above rep 30-day mean (${mean.toFixed(1)}%, σ=${stddev.toFixed(1)}%).`;
        }
      }

      return {
        repId,
        currentDiscountPercentage,
        historicalMean: Number(mean.toFixed(2)),
        historicalStdDev: Number(stddev.toFixed(2)),
        zScore,
        severity,
        message,
      };
    } catch (err: any) {
      this.logger.error(`Error calculating discount anomaly for rep ${repId}: ${err.message}`);
      return {
        repId,
        currentDiscountPercentage,
        historicalMean: 0,
        historicalStdDev: 0,
        zScore: 0,
        severity: 'NONE',
        message: 'Could not compute anomaly score due to query error.',
      };
    }
  }

  /**
   * Fetch all reps with recent statistical discount anomalies across tenant
   */
  async getActiveDiscountAnomalies(): Promise<RepDiscountAnomalyDto[]> {
    try {
      // Find reps who gave discounts in the last 7 days exceeding 2 standard deviations
      const result = await this.db.execute(sql`
        WITH rep_stats AS (
          SELECT 
            rep_id,
            AVG(applied_discount_pct)::float as mean,
            STDDEV_POP(applied_discount_pct)::float as stddev,
            COUNT(*)::int as sample_count
          FROM analytics.rep_discount_tracking
          WHERE time >= NOW() - INTERVAL '30 days'
          GROUP BY rep_id
          HAVING COUNT(*) >= 3 AND STDDEV_POP(applied_discount_pct) > 0
        ),
        recent_discounts AS (
          SELECT 
            r.rep_id,
            r.quote_id,
            r.applied_discount_pct::float as current_discount,
            s.mean,
            s.stddev,
            ((r.applied_discount_pct - s.mean) / s.stddev)::float as z_score
          FROM analytics.rep_discount_tracking r
          JOIN rep_stats s ON r.rep_id = s.rep_id
          WHERE r.time >= NOW() - INTERVAL '7 days'
        )
        SELECT *
        FROM recent_discounts
        WHERE z_score >= 2.0
        ORDER BY z_score DESC
        LIMIT 50;
      `);

      return (result.rows || []).map((row: any) => {
        const zScore = Number(Number(row.z_score).toFixed(2));
        const severity: DealHealthAnomalySeverity = zScore >= 3.0 ? 'CRITICAL' : 'WARNING';
        return {
          repId: row.rep_id,
          currentDiscountPercentage: Number(row.current_discount),
          historicalMean: Number(Number(row.mean).toFixed(2)),
          historicalStdDev: Number(Number(row.stddev).toFixed(2)),
          zScore,
          severity,
          message: `${severity}: Discount is ${zScore}σ above rep mean (${Number(row.mean).toFixed(1)}%).`,
        };
      });
    } catch (err: any) {
      this.logger.warn(`Could not fetch active discount anomalies: ${err.message}`);
      return [];
    }
  }
}
