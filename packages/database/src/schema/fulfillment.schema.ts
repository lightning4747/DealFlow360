import {
  pgSchema,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const fulfillmentSchema = pgSchema('fulfillment');

export const warehouses = fulfillmentSchema.table(
  'warehouses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 500 }),
    latitude: numeric('latitude', { precision: 10, scale: 6 }),
    longitude: numeric('longitude', { precision: 10, scale: 6 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    codeIdx: uniqueIndex('warehouses_code_idx').on(table.code),
  }),
);

export const warehouseStock = fulfillmentSchema.table(
  'warehouse_stock',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    availableQty: integer('available_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    warehouseProductIdx: uniqueIndex('warehouse_stock_wh_prod_idx').on(table.warehouseId, table.productId),
  }),
);

export type Warehouse = typeof warehouses.$inferSelect;
export type WarehouseStock = typeof warehouseStock.$inferSelect;
export const insertWarehouseSchema = createInsertSchema(warehouses);
export const selectWarehouseSchema = createSelectSchema(warehouses);

// ─── fulfillment_splits ──────────────────────────────────────────────────────
export const fulfillmentSplits = fulfillmentSchema.table(
  'fulfillment_splits',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull(),
    quoteLineId: uuid('quote_line_id'),
    productId: uuid('product_id').notNull(),
    warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    allocatedQty: integer('allocated_qty').notNull().default(1),
    shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    distanceKm: numeric('distance_km', { precision: 10, scale: 2 }).notNull().default('0.00'),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, reserved, in_transit, delivered, cancelled
    carrier: varchar('carrier', { length: 100 }),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    estimatedDeliveryDays: integer('estimated_delivery_days').default(3),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    quoteIdx: index('fulfillment_splits_quote_idx').on(table.quoteId),
    warehouseIdx: index('fulfillment_splits_wh_idx').on(table.warehouseId),
    statusIdx: index('fulfillment_splits_status_idx').on(table.status),
  }),
);

export type FulfillmentSplit = typeof fulfillmentSplits.$inferSelect;
export type NewFulfillmentSplit = typeof fulfillmentSplits.$inferInsert;
export const insertFulfillmentSplitSchema = createInsertSchema(fulfillmentSplits);
export const selectFulfillmentSplitSchema = createSelectSchema(fulfillmentSplits);

// ─── backorders ──────────────────────────────────────────────────────────────
export const backorders = fulfillmentSchema.table(
  'backorders',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    quoteId: uuid('quote_id').notNull(),
    productId: uuid('product_id').notNull(),
    requestedQty: integer('requested_qty').notNull(),
    allocatedQty: integer('allocated_qty').notNull().default(0),
    backorderQty: integer('backorder_qty').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('open'), // open, fulfilled, cancelled
    estimatedRestockDate: timestamp('estimated_restock_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    quoteIdx: index('backorders_quote_idx').on(table.quoteId),
    productIdx: index('backorders_product_idx').on(table.productId),
  }),
);

export type Backorder = typeof backorders.$inferSelect;
export type NewBackorder = typeof backorders.$inferInsert;
export const insertBackorderSchema = createInsertSchema(backorders);
export const selectBackorderSchema = createSelectSchema(backorders);
