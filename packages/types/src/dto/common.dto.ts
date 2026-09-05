import { z } from 'zod';

export const UserRoleEnum = z.enum(['admin', 'sales_rep', 'sales_manager', 'finance']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const CustomerTierEnum = z.enum(['bronze', 'silver', 'gold']);
export type CustomerTier = z.infer<typeof CustomerTierEnum>;

export const ProductCategoryEnum = z.enum(['hardware', 'services', 'subscription']);
export type ProductCategory = z.infer<typeof ProductCategoryEnum>;

export const ApiResponseEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    meta: z
      .object({
        correlationId: z.string().optional(),
        timestamp: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
        total: z.number().optional(),
      })
      .nullable(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        statusCode: z.number(),
        timestamp: z.string(),
        correlationId: z.string().optional(),
        details: z.array(z.any()).optional(),
      })
      .nullable(),
  });
