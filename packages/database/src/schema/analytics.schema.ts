import {
  pgSchema,
  uuid,
  numeric,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const analyticsSchema = pgSchema('analytics');

export const priceHistory = analyticsSchema.table(
  'price_history',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id').notNull(),
    oldPrice: numeric('old_price', { precision: 12, scale: 2 }),
    newPrice: numeric('new_price', { precision: 12, scale: 2 }).notNull(),
    changedBy: uuid('changed_by'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    productIdx: index('price_history_prod_idx').on(table.productId),
    recordedIdx: index('price_history_time_idx').on(table.recordedAt),
  }),
);

export const quoteEvents = analyticsSchema.table(
  'quote_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    quoteIdx: index('quote_events_quote_idx').on(table.quoteId),
  }),
);

export const repDiscountTracking = analyticsSchema.table(
  'rep_discount_tracking',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    time: timestamp('time', { withTimezone: true }).notNull().default(sql`now()`),
    repId: uuid('rep_id').notNull(),
    quoteId: uuid('quote_id').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    appliedDiscountPct: numeric('applied_discount_pct', { precision: 5, scale: 2 }).notNull(),
    tierCeilingPct: numeric('tier_ceiling_pct', { precision: 5, scale: 2 }).notNull(),
  },
  (table) => ({
    timeRepIdx: index('rep_discount_tracking_time_rep_idx').on(table.time, table.repId),
    categoryIdx: index('rep_discount_tracking_category_idx').on(table.category),
  }),
);

export const dealHealthMetrics = analyticsSchema.table(
  'deal_health_metrics',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    time: timestamp('time', { withTimezone: true }).notNull().default(sql`now()`),
    quoteId: uuid('quote_id').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    daysSinceUpdate: numeric('days_since_update', { precision: 6, scale: 2 }).notNull(),
    blendedRiskScore: numeric('blended_risk_score', { precision: 5, scale: 4 }),
  },
  (table) => ({
    timeQuoteIdx: index('deal_health_metrics_time_quote_idx').on(table.time, table.quoteId),
    riskScoreIdx: index('deal_health_metrics_risk_idx').on(table.blendedRiskScore),
  }),
);

export const inventorySnapshots = analyticsSchema.table(
  'inventory_snapshots',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    time: timestamp('time', { withTimezone: true }).notNull().default(sql`now()`),
    warehouseId: uuid('warehouse_id').notNull(),
    productId: uuid('product_id').notNull(),
    availableQty: numeric('available_qty', { precision: 10, scale: 2 }).notNull().default('0'),
    reservedQty: numeric('reserved_qty', { precision: 10, scale: 2 }).notNull().default('0'),
  },
  (table) => ({
    timeWhProdIdx: index('inventory_snapshots_time_wh_prod_idx').on(table.time, table.warehouseId, table.productId),
  }),
);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type QuoteEvent = typeof quoteEvents.$inferSelect;
export type RepDiscountRow = typeof repDiscountTracking.$inferSelect;
export type NewRepDiscountRow = typeof repDiscountTracking.$inferInsert;
export type DealHealthMetric = typeof dealHealthMetrics.$inferSelect;
export type NewDealHealthMetric = typeof dealHealthMetrics.$inferInsert;
export type InventorySnapshot = typeof inventorySnapshots.$inferSelect;
export type NewInventorySnapshot = typeof inventorySnapshots.$inferInsert;

export const insertPriceHistorySchema = createInsertSchema(priceHistory);
export const selectPriceHistorySchema = createSelectSchema(priceHistory);
export const insertQuoteEventSchema = createInsertSchema(quoteEvents);
export const selectQuoteEventSchema = createSelectSchema(quoteEvents);
export const insertRepDiscountTrackingSchema = createInsertSchema(repDiscountTracking);
export const selectRepDiscountTrackingSchema = createSelectSchema(repDiscountTracking);
export const insertDealHealthMetricsSchema = createInsertSchema(dealHealthMetrics);
export const selectDealHealthMetricsSchema = createSelectSchema(dealHealthMetrics);

