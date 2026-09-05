import { z } from 'zod';

export const PaymentMethodTypeSchema = z.enum(['CREDIT_CARD', 'ACH', 'WIRE']);
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;

export const ProcessPaymentRequestSchema = z.object({
  paymentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  token: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});
export type ProcessPaymentRequestDto = z.infer<typeof ProcessPaymentRequestSchema>;

export const PaymentTransactionStatusSchema = z.enum([
  'SUCCEEDED',
  'REQUIRES_ACTION',
  'FAILED',
  'PENDING',
]);
export type PaymentTransactionStatus = z.infer<typeof PaymentTransactionStatusSchema>;

export const ProcessPaymentResponseSchema = z.object({
  transactionId: z.string(),
  status: PaymentTransactionStatusSchema,
  amount: z.number(),
  currency: z.string(),
  requires3ds: z.boolean(),
  redirectUrl: z.string().url().optional(),
  declineReason: z.string().optional(),
  processedAt: z.string().datetime(),
});
export type ProcessPaymentResponseDto = z.infer<typeof ProcessPaymentResponseSchema>;

export const WebhookEventPayloadSchema = z.object({
  eventId: z.string(),
  eventType: z.enum([
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.requires_action',
  ]),
  transactionId: z.string(),
  invoiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  timestamp: z.string().datetime(),
  signature: z.string().optional(),
});
export type WebhookEventPayloadDto = z.infer<typeof WebhookEventPayloadSchema>;
