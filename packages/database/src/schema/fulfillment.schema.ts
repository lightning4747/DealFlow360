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
