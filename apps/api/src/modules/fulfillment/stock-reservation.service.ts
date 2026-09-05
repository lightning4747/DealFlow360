import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { sql } from 'drizzle-orm';
import { ReserveStockItemDto } from '@dealflow360/types';

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  /**
   * Concurrency-safe stock reservation using SELECT ... FOR UPDATE row locks.
   * Decrements available_qty and increments reserved_qty atomically inside a transaction.
   */
  async reserveStock(quoteId: string, items: ReserveStockItemDto[]) {
    this.logger.log(`Reserving stock for quote ${quoteId} (${items.length} items)`);

    return await this.db.transaction(async (tx: any) => {
      const reservationResults = [];

      for (const item of items) {
        // Atomic lock with FOR UPDATE to prevent race conditions
        const stockRows = await tx.execute(
          sql`SELECT id, warehouse_id, product_id, available_qty, reserved_qty
              FROM fulfillment.warehouse_stock
              WHERE warehouse_id = ${item.warehouseId} AND product_id = ${item.productId}
              FOR UPDATE`
        );

        if (!stockRows.rows || stockRows.rows.length === 0) {
          throw new BadRequestException(
            `Stock record not found for product ${item.productId} in warehouse ${item.warehouseId}`
          );
        }

        const currentStock = stockRows.rows[0] as {
          id: string;
          warehouse_id: string;
          product_id: string;
          available_qty: number;
          reserved_qty: number;
        };

        if (currentStock.available_qty < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId} in warehouse ${item.warehouseId}. Available: ${currentStock.available_qty}, Requested: ${item.quantity}`
          );
        }

        // Atomically update quantities
        await tx.execute(
          sql`UPDATE fulfillment.warehouse_stock
              SET available_qty = available_qty - ${item.quantity},
                  reserved_qty = reserved_qty + ${item.quantity},
                  updated_at = NOW()
              WHERE id = ${currentStock.id}`
        );

        // Update fulfillment split status if exists
        await tx.execute(
          sql`UPDATE fulfillment.fulfillment_splits
              SET status = 'reserved', updated_at = NOW()
              WHERE quote_id = ${quoteId}
                AND warehouse_id = ${item.warehouseId}
                AND product_id = ${item.productId}`
        );

        reservationResults.push({
          warehouseId: item.warehouseId,
          productId: item.productId,
          reservedQuantity: item.quantity,
          remainingAvailable: currentStock.available_qty - item.quantity,
        });
      }

      return {
        quoteId,
        status: 'reserved',
        reservations: reservationResults,
      };
    });
  }

  /**
   * Release reserved stock back to available pool.
   * Decrements reserved_qty and increments available_qty atomically.
   */
  async releaseStock(quoteId: string, items: ReserveStockItemDto[]) {
    this.logger.log(`Releasing reserved stock for quote ${quoteId} (${items.length} items)`);

    return await this.db.transaction(async (tx: any) => {
      const releaseResults = [];

      for (const item of items) {
        const stockRows = await tx.execute(
          sql`SELECT id, warehouse_id, product_id, available_qty, reserved_qty
              FROM fulfillment.warehouse_stock
              WHERE warehouse_id = ${item.warehouseId} AND product_id = ${item.productId}
              FOR UPDATE`
        );

        if (stockRows.rows && stockRows.rows.length > 0) {
          const currentStock = stockRows.rows[0] as {
            id: string;
            warehouse_id: string;
            product_id: string;
            available_qty: number;
            reserved_qty: number;
          };

          const releaseQty = Math.min(currentStock.reserved_qty, item.quantity);

          await tx.execute(
            sql`UPDATE fulfillment.warehouse_stock
                SET available_qty = available_qty + ${releaseQty},
                    reserved_qty = reserved_qty - ${releaseQty},
                    updated_at = NOW()
                WHERE id = ${currentStock.id}`
          );

          releaseResults.push({
            warehouseId: item.warehouseId,
            productId: item.productId,
            releasedQuantity: releaseQty,
          });
        }
      }

      await tx.execute(
        sql`UPDATE fulfillment.fulfillment_splits
            SET status = 'cancelled', updated_at = NOW()
            WHERE quote_id = ${quoteId}`
      );

      return {
        quoteId,
        status: 'released',
        releases: releaseResults,
      };
    });
  }

  /**
   * Query current real-time stock levels across all active warehouses for a given product or warehouse.
   */
  async getStockOverview(productId?: string, warehouseId?: string) {
    const conditions = [];
    if (productId) conditions.push(sql`ws.product_id = ${productId}`);
    if (warehouseId) conditions.push(sql`ws.warehouse_id = ${warehouseId}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const result = await this.db.execute(
      sql`SELECT ws.id, ws.warehouse_id, w.code as warehouse_code, w.name as warehouse_name,
                 w.latitude, w.longitude,
                 ws.product_id, p.name as product_name, p.sku,
                 ws.available_qty, ws.reserved_qty, ws.updated_at
          FROM fulfillment.warehouse_stock ws
          JOIN fulfillment.warehouses w ON ws.warehouse_id = w.id
          JOIN sales.products p ON ws.product_id = p.id
          ${whereClause}
          ORDER BY w.name, p.name`
    );

    return result.rows;
  }
}
