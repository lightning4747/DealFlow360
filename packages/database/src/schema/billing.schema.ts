import {
  pgSchema,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const billingSchema = pgSchema('billing');

export const subscriptions = billingSchema.table(
  'subscriptions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id').notNull(),
    quoteLineId: uuid('quote_line_id'),
    planName: varchar('plan_name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    monthlyAmount: numeric('monthly_amount', { precision: 12, scale: 2 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().default(sql`now()`),
    renewsAt: timestamp('renews_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    customerIdx: index('subscriptions_customer_idx').on(table.customerId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
  }),
);

export const invoices = billingSchema.table(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    customerId: uuid('customer_id').notNull(),
    quoteId: uuid('quote_id'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceNumberIdx: uniqueIndex('invoices_number_idx').on(table.invoiceNumber),
    customerIdx: index('invoices_customer_idx').on(table.customerId),
  }),
);

export const creditNotes = billingSchema.table(
  'credit_notes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceIdx: index('credit_notes_invoice_idx').on(table.invoiceId),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type CreditNote = typeof creditNotes.$inferSelect;
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);
