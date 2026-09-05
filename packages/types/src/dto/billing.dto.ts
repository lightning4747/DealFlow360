import { z } from 'zod';

export const PlanIntervalSchema = z.enum(['monthly', 'quarterly', 'yearly']);
export type PlanInterval = z.infer<typeof PlanIntervalSchema>;

export const SubscriptionStatusSchema = z.enum(['active', 'paused', 'cancelled', 'expired']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const InvoiceStatusSchema = z.enum(['draft', 'pending', 'sent', 'paid', 'voided', 'overdue']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceTypeSchema = z.enum(['one_time', 'recurring', 'proration']);
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;

export const BillingScheduleStatusSchema = z.enum(['pending', 'processing', 'paid', 'failed', 'invalidated', 'skipped']);
export type BillingScheduleStatus = z.infer<typeof BillingScheduleStatusSchema>;

export const CreditNoteStatusSchema = z.enum(['issued', 'applied', 'refunded']);
export type CreditNoteStatus = z.infer<typeof CreditNoteStatusSchema>;

export const ModifySubscriptionQuantitySchema = z.object({
  newQuantity: z.number().int().positive('Quantity must be greater than zero'),
  effectiveDate: z.string().datetime().optional(),
  dryRun: z.boolean().optional().default(false),
});
export type ModifySubscriptionQuantityDto = z.infer<typeof ModifySubscriptionQuantitySchema>;

export const CancelSubscriptionSchema = z.object({
  cancellationType: z.enum(['immediate', 'end_of_period']).default('immediate'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  issueCredit: z.boolean().optional().default(true),
  effectiveDate: z.string().datetime().optional(),
});
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionSchema>;

export const VoidInvoiceSchema = z.object({
  voidReason: z.string().min(5, 'A non-empty void reason of at least 5 characters is required'),
});
export type VoidInvoiceDto = z.infer<typeof VoidInvoiceSchema>;

export const SendInvoiceSchema = z.object({
  billingEmail: z.string().email('Invalid billing email'),
  ccEmails: z.array(z.string().email()).optional(),
});
export type SendInvoiceDto = z.infer<typeof SendInvoiceSchema>;

export const ProrationPreviewQuerySchema = z.object({
  targetQuantity: z.coerce.number().int().positive('Target quantity must be greater than zero'),
  effectiveDate: z.string().datetime().optional(),
});
export type ProrationPreviewQueryDto = z.infer<typeof ProrationPreviewQuerySchema>;

export interface ProrationCalculationResult {
  daysInCycle: number;
  daysRemaining: number;
  prorationFactor: number;
  oldAmount: number;
  newAmount: number;
  creditAmount: number;
  chargeAmount: number;
  creditNoteRequired: boolean;
  invoiceRequired: boolean;
}
