import { z } from 'zod';

export const DealHealthAnomalySeveritySchema = z.enum(['NONE', 'WARNING', 'CRITICAL']);
export type DealHealthAnomalySeverity = z.infer<typeof DealHealthAnomalySeveritySchema>;

export const RepDiscountAnomalySchema = z.object({
  repId: z.string().uuid(),
  repName: z.string().optional(),
  currentDiscountPercentage: z.number(),
  historicalMean: z.number(),
  historicalStdDev: z.number(),
  zScore: z.number(),
  severity: DealHealthAnomalySeveritySchema,
  message: z.string(),
});
export type RepDiscountAnomalyDto = z.infer<typeof RepDiscountAnomalySchema>;

export const StalledDealSchema = z.object({
  quoteId: z.string().uuid(),
  quoteNumber: z.string(),
  accountId: z.string().uuid(),
  accountName: z.string().optional(),
  repId: z.string().uuid(),
  status: z.string(),
  totalAmount: z.number(),
  lastActivityAt: z.string().datetime(),
  inactiveDays: z.number(),
  suggestedAction: z.string(),
});
export type StalledDealDto = z.infer<typeof StalledDealSchema>;

export const DealVelocityMetricsSchema = z.object({
  timeBucket: z.string(),
  quoteCreations: z.number(),
  quoteApprovals: z.number(),
  quoteConversions: z.number(),
  averageCycleHours: z.number(),
});
export type DealVelocityMetricsDto = z.infer<typeof DealVelocityMetricsSchema>;

export const DealHealthSummarySchema = z.object({
  tenantId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  activeQuotesCount: z.number(),
  stalledDealsCount: z.number(),
  anomaliesDetectedCount: z.number(),
  stalledDeals: z.array(StalledDealSchema),
  discountAnomalies: z.array(RepDiscountAnomalySchema),
  generatedAt: z.string().datetime(),
});
export type DealHealthSummaryDto = z.infer<typeof DealHealthSummarySchema>;

export const QueryAnalyticsDtoSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  repId: z.string().uuid().optional(),
  stalledThresholdDays: z.coerce.number().int().positive().default(7),
});
export type QueryAnalyticsDto = z.infer<typeof QueryAnalyticsDtoSchema>;
