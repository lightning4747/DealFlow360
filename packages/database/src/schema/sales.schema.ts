import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const salesSchema = pgSchema('sales');

export const userRoleEnum = salesSchema.enum('user_role', [
  'admin',
  'sales_rep',
  'sales_manager',
  'finance',
]);

export const customerTierEnum = salesSchema.enum('customer_tier', [
  'bronze',
  'silver',
  'gold',
  'platinum',
]);

export const productCategoryEnum = salesSchema.enum('product_category', [
  'hardware',
  'services',
  'subscription',
]);

export const quoteStatusEnum = salesSchema.enum('quote_status', [
  'draft',
  'pending_approval',
  'sent',
  'under_negotiation',
  'confirmed',
  'fulfilled',
  'cancelled',
  'rejected',
]);

export const approvalLevelEnum = salesSchema.enum('approval_level', [
  'level_1',
  'level_2',
  'level_3',
]);

export const approvalStatusEnum = salesSchema.enum('approval_status', [
  'pending',
  'approved',
  'rejected',
]);

export const approvalDecisionEnum = salesSchema.enum('approval_decision', [
  'pending',
  'approved',
  'rejected',
]);

export const lineTypeEnum = salesSchema.enum('line_type', ['one_time', 'recurring']);

// ─── users ───────────────────────────────────────────────────────────────────
export const users = salesSchema.table(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 320 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('sales_rep'),
    hashedPassword: text('hashed_password').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// ─── customer_tiers ──────────────────────────────────────────────────────────
export const customerTiers = salesSchema.table(
  'customer_tiers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 50 }).notNull().unique(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    maxDiscountPct: numeric('max_discount_pct', { precision: 5, scale: 2 }).notNull(),
    approvalThresholdPct: numeric('approval_threshold_pct', { precision: 5, scale: 2 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    codeIdx: uniqueIndex('customer_tiers_code_idx').on(table.code),
  }),
);

export type CustomerTier = typeof customerTiers.$inferSelect;
export type NewCustomerTier = typeof customerTiers.$inferInsert;
export const insertCustomerTierSchema = createInsertSchema(customerTiers);
export const selectCustomerTierSchema = createSelectSchema(customerTiers);

// ─── customers (accounts) ─────────────────────────────────────────────────────
export const customers = salesSchema.table(
  'customers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    company: varchar('company', { length: 255 }).notNull(),
    tier: customerTierEnum('tier').notNull().default('bronze'),
    tierId: uuid('tier_id').references(() => customerTiers.id, { onDelete: 'set null' }),
    creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('100000.00'),
    location: text('location'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    emailIdx: uniqueIndex('customers_email_idx').on(table.email),
    tierIdx: index('customers_tier_idx').on(table.tier),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export const insertCustomerSchema = createInsertSchema(customers);
export const selectCustomerSchema = createSelectSchema(customers);

// ─── products ────────────────────────────────────────────────────────────────
export const products = salesSchema.table(
  'products',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sku: varchar('sku', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    category: productCategoryEnum('category').notNull(),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    unit: varchar('unit', { length: 50 }).notNull().default('each'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.0000'),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    skuIdx: uniqueIndex('products_sku_idx').on(table.sku),
    categoryIdx: index('products_category_idx').on(table.category),
    activeIdx: index('products_active_idx').on(table.isActive),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);

// ─── product_variants ────────────────────────────────────────────────────────
export const productVariants = salesSchema.table(
  'product_variants',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    extraPrice: numeric('extra_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => ({
    productIdx: index('product_variants_product_idx').on(table.productId),
  }),
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

// ─── price_lists ─────────────────────────────────────────────────────────────
export const priceLists = salesSchema.table(
  'price_lists',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    tierId: uuid('tier_id').references(() => customerTiers.id, { onDelete: 'set null' }),
    effectiveDate: timestamp('effective_date', { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    tierIdx: index('price_lists_tier_idx').on(table.tierId),
  }),
);

export type PriceList = typeof priceLists.$inferSelect;
export type NewPriceList = typeof priceLists.$inferInsert;
export const insertPriceListSchema = createInsertSchema(priceLists);
export const selectPriceListSchema = createSelectSchema(priceLists);

// ─── price_list_items ────────────────────────────────────────────────────────
export const priceListItems = salesSchema.table(
  'price_list_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    priceListId: uuid('price_list_id').notNull().references(() => priceLists.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    priceListProductUnique: uniqueIndex('price_list_items_uq').on(table.priceListId, table.productId),
    productIdx: index('price_list_items_product_idx').on(table.productId),
  }),
);

export type PriceListItem = typeof priceListItems.$inferSelect;
export type NewPriceListItem = typeof priceListItems.$inferInsert;

// ─── discount_tiers ──────────────────────────────────────────────────────────
export const discountTiers = salesSchema.table(
  'discount_tiers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    customerTier: customerTierEnum('customer_tier').notNull(),
    category: productCategoryEnum('category').notNull(),
    maxDiscountPct: numeric('max_discount_pct', { precision: 5, scale: 2 }).notNull(),
    approvalThresholdPct: numeric('approval_threshold_pct', { precision: 5, scale: 2 }).notNull(),
    approverRole: userRoleEnum('approver_role').notNull(),
  },
  (table) => ({
    tierCategoryUnique: uniqueIndex('discount_tiers_tier_cat_uq').on(table.customerTier, table.category),
  }),
);

export type DiscountTier = typeof discountTiers.$inferSelect;
export type NewDiscountTier = typeof discountTiers.$inferInsert;

// ─── discount_ceilings ───────────────────────────────────────────────────────
export const discountCeilings = salesSchema.table(
  'discount_ceilings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tierId: uuid('tier_id').notNull().references(() => customerTiers.id, { onDelete: 'cascade' }),
    category: productCategoryEnum('category').notNull(),
    maxDiscountPct: numeric('max_discount_pct', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    tierCatUnique: uniqueIndex('discount_ceilings_tier_cat_uq').on(table.tierId, table.category),
    tierIdx: index('discount_ceilings_tier_idx').on(table.tierId),
  }),
);

export type DiscountCeiling = typeof discountCeilings.$inferSelect;
export type NewDiscountCeiling = typeof discountCeilings.$inferInsert;
export const insertDiscountCeilingSchema = createInsertSchema(discountCeilings);
export const selectDiscountCeilingSchema = createSelectSchema(discountCeilings);

// ─── quotes ──────────────────────────────────────────────────────────────────
export const quotes = salesSchema.table(
  'quotes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteNumber: varchar('quote_number', { length: 50 }).notNull().unique(),
    repId: uuid('rep_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
    status: quoteStatusEnum('status').notNull().default('draft'),
    blendedRiskScore: numeric('blended_risk_score', { precision: 8, scale: 4 }),
    brsScore: numeric('brs_score', { precision: 5, scale: 2 }),
    currentApprovalStep: integer('current_approval_step').default(1),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    repIdx: index('quotes_rep_idx').on(table.repId),
    customerIdx: index('quotes_customer_idx').on(table.customerId),
    statusIdx: index('quotes_status_idx').on(table.status),
  }),
);

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export const insertQuoteSchema = createInsertSchema(quotes);
export const selectQuoteSchema = createSelectSchema(quotes);

// ─── quote_lines ─────────────────────────────────────────────────────────────
export const quoteLines = salesSchema.table(
  'quote_lines',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    appliedCeilingPct: numeric('applied_ceiling_pct', { precision: 5, scale: 2 }),
    violationScore: numeric('violation_score', { precision: 8, scale: 4 }).default('0.0000'),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
    lineType: lineTypeEnum('line_type').notNull().default('one_time'),
  },
  (table) => ({
    quoteIdx: index('quote_lines_quote_idx').on(table.quoteId),
    productIdx: index('quote_lines_product_idx').on(table.productId),
  }),
);

export type QuoteLine = typeof quoteLines.$inferSelect;
export type NewQuoteLine = typeof quoteLines.$inferInsert;
export const insertQuoteLineSchema = createInsertSchema(quoteLines);
export const selectQuoteLineSchema = createSelectSchema(quoteLines);

// ─── approvals ───────────────────────────────────────────────────────────────
export const approvals = salesSchema.table(
  'approvals',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    brsScore: numeric('brs_score', { precision: 5, scale: 2 }).notNull().default('0.00'),
    approvalLevel: approvalLevelEnum('approval_level').notNull().default('level_1'),
    status: approvalStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    quoteIdx: index('approvals_quote_idx').on(table.quoteId),
    statusIdx: index('approvals_status_idx').on(table.status),
  }),
);

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export const insertApprovalSchema = createInsertSchema(approvals);
export const selectApprovalSchema = createSelectSchema(approvals);

// ─── approval_steps ──────────────────────────────────────────────────────────
export const approvalSteps = salesSchema.table(
  'approval_steps',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    approvalId: uuid('approval_id').notNull().references(() => approvals.id, { onDelete: 'cascade' }),
    stepOrder: integer('step_order').notNull(),
    roleRequired: userRoleEnum('role_required').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    decision: approvalDecisionEnum('decision').notNull().default('pending'),
    decisionReason: text('decision_reason'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    approvalIdx: index('approval_steps_approval_idx').on(table.approvalId),
    roleIdx: index('approval_steps_role_idx').on(table.roleRequired),
    decisionIdx: index('approval_steps_decision_idx').on(table.decision),
  }),
);

export type ApprovalStep = typeof approvalSteps.$inferSelect;
export type NewApprovalStep = typeof approvalSteps.$inferInsert;
export const insertApprovalStepSchema = createInsertSchema(approvalSteps);
export const selectApprovalStepSchema = createSelectSchema(approvalSteps);

// ─── audit_logs ──────────────────────────────────────────────────────────────
export const auditLogs = salesSchema.table(
  'audit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    actorId: uuid('actor_id'),
    actorRole: varchar('actor_role', { length: 50 }),
    stateBefore: jsonb('state_before'),
    stateAfter: jsonb('state_after'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    actorIdx: index('audit_logs_actor_idx').on(table.actorId),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
