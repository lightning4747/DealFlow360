import { z } from 'zod';
import { ProductCategoryEnum, LineTypeEnum } from './common.dto';

// ─── Deal Studio Quote Calculation DTOs ──────────────────────────────────────
export const QuoteLineItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  // Accepted for backwards-compatible clients but ignored by the API.
  unitPrice: z.number().positive().optional().default(0),
  unitCost: z.number().nonnegative().optional().default(0),
  discountPct: z.number().min(0).max(100).default(0),
  lineType: LineTypeEnum.default('one_time'),
});
export type QuoteLineItemInputDto = z.infer<typeof QuoteLineItemInputSchema>;

export const CalculateQuoteSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),
  lines: z.array(QuoteLineItemInputSchema).min(1),
  overrideDiscountPct: z.number().min(0).max(100).optional(),
});
export type CalculateQuoteDto = z.infer<typeof CalculateQuoteSchema>;

export interface CalculatedLineResult {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPct: number;
  subtotal: number;
  discountAmount: number;
  lineTotal: number;
  lineCostTotal: number;
  lineMarginAmount: number;
  lineMarginPct: number;
  appliedCeilingPct: number;
  violationScore: number;
  isCeilingViolated: boolean;
  lineType: string;
}

export interface QuoteCalculationSummary {
  subtotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  totalCost: number;
  grossMarginAmount: number;
  grossMarginPct: number;
  marginHealth: 'healthy' | 'caution' | 'critical';
  brsScore: number;
  requiresApproval: boolean;
  approvalLevel: 'none' | 'level_1' | 'level_2' | 'level_3';
  lines: CalculatedLineResult[];
}

// ─── Quote Create / Update DTOs ──────────────────────────────────────────────
export const CreateQuoteSchema = z.object({
  customerId: z.string().uuid(),
  expiresAt: z.string().optional(),
  lines: z.array(QuoteLineItemInputSchema).min(1),
});
export type CreateQuoteDto = z.infer<typeof CreateQuoteSchema>;

export const UpdateQuoteLineSchema = z.object({
  quantity: z.number().int().positive().optional(),
  discountPct: z.number().min(0).max(100).optional(),
});
export type UpdateQuoteLineDto = z.infer<typeof UpdateQuoteLineSchema>;

// ─── Line Redlining / Comments DTOs ──────────────────────────────────────────
export const CreateLineCommentSchema = z.object({
  comment: z.string().min(1).max(2000),
  suggestedDiscountPct: z.number().min(0).max(100).optional(),
});
export type CreateLineCommentDto = z.infer<typeof CreateLineCommentSchema>;

// ─── Customer Counter-Proposal DTOs ─────────────────────────────────────────
export const CustomerCounterProposalSchema = z.object({
  counterDiscountPct: z.number().min(0).max(100),
  notes: z.string().max(2000).optional(),
  participantName: z.string().min(1).max(255).optional(),
});
export type CustomerCounterProposalDto = z.infer<typeof CustomerCounterProposalSchema>;

// ─── Recommendations Query DTOs ──────────────────────────────────────────────
export const QueryRecommendationsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});
export type QueryRecommendationsDto = z.infer<typeof QueryRecommendationsSchema>;
