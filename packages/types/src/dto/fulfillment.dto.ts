import { z } from 'zod';

export const FulfillmentSplitItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type FulfillmentSplitItemDto = z.infer<typeof FulfillmentSplitItemSchema>;

export const CalculateFulfillmentSplitSchema = z.object({
  quoteId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  destinationLatitude: z.number().min(-90).max(90).optional().nullable(),
  destinationLongitude: z.number().min(-180).max(180).optional().nullable(),
  items: z.array(FulfillmentSplitItemSchema).min(1),
});
export type CalculateFulfillmentSplitDto = z.infer<typeof CalculateFulfillmentSplitSchema>;

export const ReserveStockItemSchema = z.object({
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type ReserveStockItemDto = z.infer<typeof ReserveStockItemSchema>;

export const ReserveStockRequestSchema = z.object({
  quoteId: z.string().uuid(),
  reservations: z.array(ReserveStockItemSchema).min(1),
});
export type ReserveStockRequestDto = z.infer<typeof ReserveStockRequestSchema>;

export const ReleaseStockRequestSchema = z.object({
  quoteId: z.string().uuid(),
  releases: z.array(ReserveStockItemSchema).min(1),
});
export type ReleaseStockRequestDto = z.infer<typeof ReleaseStockRequestSchema>;

export interface SplitResultWarehouseAllocation {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  distanceKm: number;
  allocatedItems: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
  }[];
  shippingCostEstimate: number;
}

export interface SplitCalculationResult {
  quoteId: string;
  totalDistanceKm: number;
  totalEstimatedShippingCost: number;
  hubCount: number;
  allocations: SplitResultWarehouseAllocation[];
  backorders: {
    productId: string;
    quantity: number;
    reason: string;
  }[];
}
