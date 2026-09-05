import { z } from 'zod';
import { ProductCategoryEnum } from './common.dto';

export const CreateProductSchema = z.object({
  sku: z.string().min(3).max(50),
  name: z.string().min(2).max(255),
  category: ProductCategoryEnum,
  basePrice: z.number().positive(),
  unitCost: z.number().nonnegative(),
  unit: z.string().default('unit'),
  taxRate: z.number().min(0).max(100).default(0),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

export const CreateCustomerTierSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  maxDiscountPct: z.number().min(0).max(100),
  approvalThresholdPct: z.number().min(0).max(100),
  description: z.string().optional(),
});
export type CreateCustomerTierDto = z.infer<typeof CreateCustomerTierSchema>;

export const CreatePriceListSchema = z.object({
  name: z.string().min(2),
  tierId: z.string().uuid().optional(),
  effectiveDate: z.string().optional(),
});
export type CreatePriceListDto = z.infer<typeof CreatePriceListSchema>;

export const BulkPriceListItemSchema = z.object({
  productId: z.string().uuid(),
  price: z.number().positive(),
});

export const BulkPriceListItemsSchema = z.object({
  items: z.array(BulkPriceListItemSchema),
});
export type BulkPriceListItemsDto = z.infer<typeof BulkPriceListItemsSchema>;
