import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@dealflow360/database';
import { DRIZZLE_DB } from '../database/database.module';
import { StalledDealDto } from '@dealflow360/types';

@Injectable()
export class StalledDealsService {
  private readonly logger = new Logger(StalledDealsService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Scans for quotes in non-terminal states that have had no updates/activity
   * for more than thresholdDays (default 7 days).
   * Terminal states in the live sales schema are fulfilled and cancelled.
   */
  async findStalledDeals(thresholdDays: number = 7, tenantId?: string): Promise<StalledDealDto[]> {
    try {
      const daysInterval = `${Math.max(1, Math.floor(thresholdDays))} days`;

      const result = await this.db.execute(sql`
        SELECT 
          q.id as quote_id,
          q.quote_number,
          q.customer_id as account_id,
          a.name as account_name,
          q.rep_id,
          q.status,
          q.total_amount::float as total_amount,
          COALESCE(q.updated_at, q.created_at) as last_activity_at,
          EXTRACT(DAY FROM (NOW() - COALESCE(q.updated_at, q.created_at)))::int as inactive_days
        FROM sales.quotes q
        LEFT JOIN sales.customers a ON q.customer_id = a.id
        WHERE q.status NOT IN ('fulfilled', 'cancelled')
          AND COALESCE(q.updated_at, q.created_at) < NOW() - ${daysInterval}::interval
        ORDER BY inactive_days DESC, total_amount DESC
        LIMIT 100;
      `);

      return (result.rows || []).map((row: any) => {
        const inactiveDays = Number(row.inactive_days || 0);
        let suggestedAction = 'Follow up with sales rep';
        if (row.status === 'PENDING_APPROVAL') {
          suggestedAction = 'Nudge approval managers or escalate SLA';
        } else if (row.status === 'APPROVED') {
          suggestedAction = 'Prompt customer for contract signature or quote execution';
        } else if (inactiveDays > 14) {
          suggestedAction = 'Evaluate deal qualification or mark as CLOSED_LOST';
        }

        return {
          quoteId: row.quote_id,
          quoteNumber: row.quote_number || 'UNKNOWN',
          accountId: row.account_id || row.customer_id,
          accountName: row.account_name || 'Unknown Account',
          repId: row.rep_id,
          status: row.status,
          totalAmount: Number(row.total_amount || 0),
          lastActivityAt: new Date(row.last_activity_at).toISOString(),
          inactiveDays,
          suggestedAction,
        };
      });
    } catch (err: any) {
      this.logger.error(`Error finding stalled deals: ${err.message}`);
      throw new InternalServerErrorException('Stalled deal data is unavailable');
    }
  }
}
