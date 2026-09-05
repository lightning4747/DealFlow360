import {
  pgSchema,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  text,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const billingSchema = pgSchema('billing');

// ─── Enums ───────────────────────────────────────────────────────────────────
export const planIntervalEnum = billingSchema.enum('plan_interval', [
  'monthly',
  'quarterly',
  'yearly',
]);

export const subscriptionStatusEnum = billingSchema.enum('subscription_status', [
  'active',
  'paused',
  'cancelled',
  'expired',
]);

export const billingScheduleStatusEnum = billingSchema.enum('billing_schedule_status', [
  'pending',
  'processing',
  'paid',
  'failed',
  'invalidated',
  'skipped',
]);

export const invoiceTypeEnum = billingSchema.enum('invoice_type', [
  'one_time',
  'recurring',
  'proration',
]);

export const invoiceStatusEnum = billingSchema.enum('invoice_status', [
  'draft',
  'pending',
  'sent',
  'paid',
  'voided',
  'overdue',
]);

export const creditNoteStatusEnum = billingSchema.enum('credit_note_status', [
  'issued',
  'applied',
  'refunded',
]);

export const paymentStatusEnum = billingSchema.enum('payment_status', [
  'pending',
  'succeeded',
  'failed',
]);

// ─── subscriptions ───────────────────────────────────────────────────────────
export const subscriptions = billingSchema.table(
  'subscriptions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid('customer_id').notNull(),
    accountId: uuid('account_id'),
    quoteId: uuid('quote_id'),
    quoteLineId: uuid('quote_line_id'),
    productId: uuid('product_id'),
    planName: varchar('plan_name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    monthlyAmount: numeric('monthly_amount', { precision: 12, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    mrr: numeric('mrr', { precision: 12, scale: 2 }).notNull().default('0.00'),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    billingInterval: varchar('billing_interval', { length: 50 }).notNull().default('monthly'),
    intervalDays: integer('interval_days').notNull().default(30),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    nextBillingDate: timestamp('next_billing_date', { withTimezone: true }),
    autoRenew: boolean('auto_renew').notNull().default(true),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().default(sql`now()`),
    renewsAt: timestamp('renews_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    customerIdx: index('subscriptions_customer_idx').on(table.customerId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    quoteIdx: index('subscriptions_quote_idx').on(table.quoteId),
    nextBillingIdx: index('subscriptions_next_billing_idx').on(table.nextBillingDate),
  }),
);

// ─── billing_schedules ───────────────────────────────────────────────────────
export const billingSchedules = billingSchema.table(
  'billing_schedules',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    scheduleDate: timestamp('schedule_date', { withTimezone: true }).notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    invoiceId: uuid('invoice_id'),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    subscriptionIdx: index('billing_schedules_subscription_idx').on(table.subscriptionId),
    scheduleDateIdx: index('billing_schedules_schedule_date_idx').on(table.scheduleDate),
    statusIdx: index('billing_schedules_status_idx').on(table.status),
  }),
);

// ─── invoices ────────────────────────────────────────────────────────────────
export const invoices = billingSchema.table(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    customerId: uuid('customer_id').notNull(),
    accountId: uuid('account_id'),
    quoteId: uuid('quote_id'),
    invoiceType: varchar('invoice_type', { length: 50 }).notNull().default('one_time'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).default(sql`now()`),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    voidedBy: uuid('voided_by'),
    sentTo: varchar('sent_to', { length: 320 }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceNumberIdx: uniqueIndex('invoices_number_idx').on(table.invoiceNumber),
    customerIdx: index('invoices_customer_idx').on(table.customerId),
    quoteIdx: index('invoices_quote_idx').on(table.quoteId),
    statusIdx: index('invoices_status_idx').on(table.status),
  }),
);

// ─── invoice_lines ───────────────────────────────────────────────────────────
export const invoiceLines = billingSchema.table(
  'invoice_lines',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    quoteLineId: uuid('quote_line_id'),
    productId: uuid('product_id'),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    totalPrice: numeric('total_price', { precision: 14, scale: 2 }).notNull(),
    fulfillmentRequired: boolean('fulfillment_required').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceIdx: index('invoice_lines_invoice_idx').on(table.invoiceId),
    productIdx: index('invoice_lines_product_idx').on(table.productId),
  }),
);

// ─── credit_notes ────────────────────────────────────────────────────────────
export const creditNotes = billingSchema.table(
  'credit_notes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    creditNoteNumber: varchar('credit_note_number', { length: 50 }).notNull().unique(),
    customerId: uuid('customer_id'),
    accountId: uuid('account_id'),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('issued'),
    issuedBy: uuid('issued_by'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).default(sql`now()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceIdx: index('credit_notes_invoice_idx').on(table.invoiceId),
    subscriptionIdx: index('credit_notes_subscription_idx').on(table.subscriptionId),
    creditNoteNumberIdx: uniqueIndex('credit_notes_number_idx').on(table.creditNoteNumber),
  }),
);

// ─── payments ────────────────────────────────────────────────────────────────
export const payments = billingSchema.table(
  'payments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull(),
    accountId: uuid('account_id'),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('card'),
    gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    invoiceIdx: index('payments_invoice_idx').on(table.invoiceId),
    customerIdx: index('payments_customer_idx').on(table.customerId),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type BillingSchedule = typeof billingSchedules.$inferSelect;
export type NewBillingSchedule = typeof billingSchedules.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
export type CreditNote = typeof creditNotes.$inferSelect;
export type NewCreditNote = typeof creditNotes.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertBillingScheduleSchema = createInsertSchema(billingSchedules);
export const selectBillingScheduleSchema = createSelectSchema(billingSchedules);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);
export const insertInvoiceLineSchema = createInsertSchema(invoiceLines);
export const selectInvoiceLineSchema = createSelectSchema(invoiceLines);
export const insertCreditNoteSchema = createInsertSchema(creditNotes);
export const selectCreditNoteSchema = createSelectSchema(creditNotes);
