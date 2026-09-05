import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const portalSchema = pgSchema('portal');

export const magicLinks = portalSchema.table(
  'magic_links',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    quoteId: uuid('quote_id').notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('magic_links_hash_idx').on(table.tokenHash),
    quoteIdx: index('magic_links_quote_idx').on(table.quoteId),
  }),
);

export type MagicLink = typeof magicLinks.$inferSelect;
export type NewMagicLink = typeof magicLinks.$inferInsert;
export const insertMagicLinkSchema = createInsertSchema(magicLinks);
export const selectMagicLinkSchema = createSelectSchema(magicLinks);
