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

// ─── negotiation_sessions ────────────────────────────────────────────────────
export const negotiationSessions = portalSchema.table(
  'negotiation_sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull(),
    sessionToken: varchar('session_token', { length: 128 }).notNull().unique(),
    participantEmail: varchar('participant_email', { length: 320 }).notNull(),
    participantName: varchar('participant_name', { length: 255 }).notNull(),
    participantRole: varchar('participant_role', { length: 50 }).notNull().default('customer'),
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, closed, expired
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    sessionTokenIdx: uniqueIndex('negotiation_sessions_token_idx').on(table.sessionToken),
    quoteIdx: index('negotiation_sessions_quote_idx').on(table.quoteId),
  }),
);

export type NegotiationSession = typeof negotiationSessions.$inferSelect;
export type NewNegotiationSession = typeof negotiationSessions.$inferInsert;
export const insertNegotiationSessionSchema = createInsertSchema(negotiationSessions);
export const selectNegotiationSessionSchema = createSelectSchema(negotiationSessions);
