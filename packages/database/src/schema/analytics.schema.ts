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

export type PriceHistory = typeof priceHistory.$inferSelect;
export type QuoteEvent = typeof quoteEvents.$inferSelect;
export const insertPriceHistorySchema = createInsertSchema(priceHistory);
export const selectPriceHistorySchema = createSelectSchema(priceHistory);
