import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { fulfillmentSplits, backorders, warehouses } from '@dealflow360/database';
import { eq, sql } from 'drizzle-orm';
import { SplitCalculationResult } from '@dealflow360/types';

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Save calculated fulfillment split plan and any backorders into the database.
   */
  async saveSplitPlan(plan: SplitCalculationResult) {
    this.logger.log(`Persisting fulfillment split plan for quote ${plan.quoteId}`);

    return await this.dbService.db.transaction(async (tx) => {
      // Clear existing splits for this quote if re-calculating
      await tx.execute(
        sql`DELETE FROM fulfillment.fulfillment_splits WHERE quote_id = ${plan.quoteId}`
      );
      await tx.execute(
        sql`DELETE FROM fulfillment.backorders WHERE quote_id = ${plan.quoteId}`
      );

      const insertedSplits = [];
      for (const alloc of plan.allocations) {
        for (const item of alloc.allocatedItems) {
          const splitRes = await tx.execute(
            sql`INSERT INTO fulfillment.fulfillment_splits (
                  quote_id, product_id, warehouse_id, allocated_qty, shipping_cost, distance_km, status
                ) VALUES (
                  ${plan.quoteId}, ${item.productId}, ${alloc.warehouseId}, ${item.quantity},
                  ${alloc.shippingCostEstimate}, ${alloc.distanceKm}, 'pending'
                ) RETURNING *`
          );
          if (splitRes.rows && splitRes.rows[0]) {
            insertedSplits.push(splitRes.rows[0]);
          }
        }
      }

      const insertedBackorders = [];
      for (const bo of plan.backorders) {
        const boRes = await tx.execute(
          sql`INSERT INTO fulfillment.backorders (
                quote_id, product_id, requested_qty, allocated_qty, backorder_qty, status
              ) VALUES (
                ${plan.quoteId}, ${bo.productId}, ${bo.quantity}, 0, ${bo.quantity}, 'open'
              ) RETURNING *`
        );
        if (boRes.rows && boRes.rows[0]) {
          insertedBackorders.push(boRes.rows[0]);
        }
      }

      return {
        quoteId: plan.quoteId,
        splits: insertedSplits,
        backorders: insertedBackorders,
      };
    });
  }

  /**
   * Fetch fulfillment plan and delivery status for a quote.
   */
  async getSplitsByQuoteId(quoteId: string) {
    const splitsResult = await this.dbService.db.execute(
      sql`SELECT fs.id, fs.quote_id, fs.warehouse_id, w.code as warehouse_code, w.name as warehouse_name,
                 w.latitude as warehouse_latitude, w.longitude as warehouse_longitude,
                 fs.product_id, p.name as product_name, p.sku,
                 fs.allocated_qty, fs.shipping_cost, fs.distance_km, fs.status,
                 fs.carrier, fs.tracking_number, fs.estimated_delivery_days, fs.created_at
          FROM fulfillment.fulfillment_splits fs
          JOIN fulfillment.warehouses w ON fs.warehouse_id = w.id
          JOIN catalog.products p ON fs.product_id = p.id
          WHERE fs.quote_id = ${quoteId}
          ORDER BY w.name, p.name`
    );

    const backordersResult = await this.dbService.db.execute(
      sql`SELECT bo.id, bo.quote_id, bo.product_id, p.name as product_name, p.sku,
                 bo.requested_qty, bo.allocated_qty, bo.backorder_qty, bo.status,
                 bo.estimated_restock_date, bo.created_at
          FROM fulfillment.backorders bo
          JOIN catalog.products p ON bo.product_id = p.id
          WHERE bo.quote_id = ${quoteId}`
    );

    return {
      quoteId,
      splits: splitsResult.rows,
      backorders: backordersResult.rows,
    };
  }

  /**
   * List all active regional warehouse distribution hubs with their spatial coordinates.
   */
  async getWarehouses() {
    const result = await this.dbService.db.execute(
      sql`SELECT id, code, name, address, latitude, longitude, is_active, created_at
          FROM fulfillment.warehouses
          WHERE is_active = true
          ORDER BY code ASC`
    );
    return result.rows;
  }
}
