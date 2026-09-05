import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { sql } from 'drizzle-orm';
import {
  CalculateFulfillmentSplitDto,
  SplitCalculationResult,
  SplitResultWarehouseAllocation,
} from '@dealflow360/types';

interface WarehouseCandidate {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

interface HubStockAvailability {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  distanceKm: number;
  productId: string;
  productName: string;
  sku: string;
  unitCost: number;
  availableQty: number;
}

@Injectable()
export class SpatialAllocationEngine {
  private readonly logger = new Logger(SpatialAllocationEngine.name);

  // Freight rate model: Base dispatch fee ($35.00) + $0.08 per km per line item unit
  private readonly BASE_DISPATCH_FEE = 35.0;
  private readonly RATE_PER_KM_PER_UNIT = 0.08;

  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  /**
   * Determine customer delivery coordinates from request or fallback to customer record.
   */
  private async resolveDestination(
    customerId?: string | null,
    destLat?: number | null,
    destLon?: number | null
  ): Promise<{ latitude: number; longitude: number }> {
    if (destLat !== undefined && destLat !== null && destLon !== undefined && destLon !== null) {
      return { latitude: Number(destLat), longitude: Number(destLon) };
    }

    if (customerId) {
      const custRes = await this.db.execute(
        sql`SELECT delivery_latitude, delivery_longitude FROM sales.customers WHERE id = ${customerId}`
      );
      const custRows: any[] = Array.isArray(custRes) ? custRes : (custRes as any)?.rows || [];
      if (custRows[0]) {
        const row = custRows[0];
        if (row.delivery_latitude && row.delivery_longitude) {
          return {
            latitude: parseFloat(row.delivery_latitude),
            longitude: parseFloat(row.delivery_longitude),
          };
        }
      }
    }

    // Default geographic midpoint (e.g., Central US / Kansas City) if unknown
    return { latitude: 39.099727, longitude: -94.578567 };
  }

  /**
   * Calculates cost-weighted spatial fulfillment allocation across regional hubs.
   * Prioritizes single-hub fulfillment to minimize bifurcated shipments, falling back
   * to closest-hub greedy allocation when stock is fragmented.
   */
  async calculateFulfillmentSplit(dto: CalculateFulfillmentSplitDto): Promise<SplitCalculationResult> {
    this.logger.log(`Executing spatial fulfillment allocation for quote ${dto.quoteId}`);

    const destination = await this.resolveDestination(
      dto.customerId,
      dto.destinationLatitude,
      dto.destinationLongitude
    );

    // 1. Fetch active warehouses sorted by PostGIS distance to destination
    const warehouseRows = await this.db.execute(
      sql`SELECT id, code, name, latitude, longitude,
                 fulfillment.calculate_distance_km(
                   latitude::numeric, longitude::numeric,
                   ${destination.latitude}::numeric, ${destination.longitude}::numeric
                 ) as distance_km
          FROM fulfillment.warehouses
          WHERE is_active = true
          ORDER BY distance_km ASC`
    );

    const warehouseList: any[] = Array.isArray(warehouseRows)
      ? warehouseRows
      : (warehouseRows as any)?.rows || [];

    const candidateHubs: WarehouseCandidate[] = warehouseList.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      distanceKm: parseFloat(r.distance_km) || 0.0,
    }));

    // 2. Fetch stock levels across all hubs for the requested items
    const productIds = dto.items.map((i) => i.productId);
    const stockResult = await this.db.execute(
      sql`SELECT ws.warehouse_id, ws.product_id, ws.available_qty,
                 p.name as product_name, p.sku, p.unit_cost as unit_cost
          FROM fulfillment.warehouse_stock ws
          JOIN sales.products p ON ws.product_id = p.id
          WHERE ws.product_id IN (${sql.join(productIds, sql`, `)})`
    );

    const stockList: any[] = Array.isArray(stockResult)
      ? stockResult
      : (stockResult as any)?.rows || [];

    const stockMap = new Map<string, Map<string, { available: number; name: string; sku: string; cost: number }>>();
    for (const r of stockList) {
      if (!stockMap.has(r.warehouse_id)) {
        stockMap.set(r.warehouse_id, new Map());
      }
      stockMap.get(r.warehouse_id)!.set(r.product_id, {
        available: parseInt(r.available_qty, 10),
        name: r.product_name,
        sku: r.sku,
        cost: parseFloat(r.unit_cost) || 0.0,
      });
    }

    // 3. Evaluation: Check if any single hub can fulfill 100% of requested items
    let singleHubMatch: WarehouseCandidate | null = null;
    for (const hub of candidateHubs) {
      const hubStock = stockMap.get(hub.id);
      if (!hubStock) continue;

      const canFullySatisfy = dto.items.every((req) => {
        const itemStock = hubStock.get(req.productId);
        return itemStock && itemStock.available >= req.quantity;
      });

      if (canFullySatisfy) {
        singleHubMatch = hub;
        break; // First candidate is closest due to ORDER BY distance_km ASC
      }
    }

    const allocations: SplitResultWarehouseAllocation[] = [];
    const backorders: { productId: string; quantity: number; reason: string }[] = [];

    if (singleHubMatch) {
      // Single-hub optimal fulfillment
      const hubStock = stockMap.get(singleHubMatch.id)!;
      const allocatedItems = dto.items.map((item) => {
        const prod = hubStock.get(item.productId)!;
        return {
          productId: item.productId,
          productName: prod.name,
          sku: prod.sku,
          quantity: item.quantity,
          unitCost: prod.cost,
        };
      });

      const totalUnits = dto.items.reduce((sum, i) => sum + i.quantity, 0);
      const estShippingCost =
        Math.round((this.BASE_DISPATCH_FEE + singleHubMatch.distanceKm * this.RATE_PER_KM_PER_UNIT * totalUnits) * 100) /
        100;

      allocations.push({
        warehouseId: singleHubMatch.id,
        warehouseCode: singleHubMatch.code,
        warehouseName: singleHubMatch.name,
        distanceKm: singleHubMatch.distanceKm,
        allocatedItems,
        shippingCostEstimate: estShippingCost,
      });
    } else {
      // Multi-hub bifurcated fulfillment: Greedy closest-hub allocation
      for (const req of dto.items) {
        let remainingNeeded = req.quantity;

        for (const hub of candidateHubs) {
          if (remainingNeeded <= 0) break;

          const hubStock = stockMap.get(hub.id);
          if (!hubStock) continue;

          const prod = hubStock.get(req.productId);
          if (!prod || prod.available <= 0) continue;

          const allocQty = Math.min(prod.available, remainingNeeded);
          remainingNeeded -= allocQty;
          prod.available -= allocQty; // Deduct local simulation

          let existingAlloc = allocations.find((a) => a.warehouseId === hub.id);
          if (!existingAlloc) {
            existingAlloc = {
              warehouseId: hub.id,
              warehouseCode: hub.code,
              warehouseName: hub.name,
              distanceKm: hub.distanceKm,
              allocatedItems: [],
              shippingCostEstimate: 0,
            };
            allocations.push(existingAlloc);
          }

          existingAlloc.allocatedItems.push({
            productId: req.productId,
            productName: prod.name,
            sku: prod.sku,
            quantity: allocQty,
            unitCost: prod.cost,
          });
        }

        if (remainingNeeded > 0) {
          backorders.push({
            productId: req.productId,
            quantity: remainingNeeded,
            reason: 'Insufficient inventory across all regional distribution hubs',
          });
        }
      }

      // Compute shipping costs per hub split
      for (const alloc of allocations) {
        const units = alloc.allocatedItems.reduce((sum, item) => sum + item.quantity, 0);
        alloc.shippingCostEstimate =
          Math.round((this.BASE_DISPATCH_FEE + alloc.distanceKm * this.RATE_PER_KM_PER_UNIT * units) * 100) / 100;
      }
    }

    const totalDistance = allocations.reduce((sum, a) => sum + a.distanceKm, 0);
    const totalShipping = allocations.reduce((sum, a) => sum + a.shippingCostEstimate, 0);

    return {
      quoteId: dto.quoteId,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      totalEstimatedShippingCost: Math.round(totalShipping * 100) / 100,
      hubCount: allocations.length,
      allocations,
      backorders,
    };
  }
}
