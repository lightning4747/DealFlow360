export interface BaseJobPayload {
  correlationId?: string;
  tenantId?: string;
}

export interface EmailNotificationJobPayload extends BaseJobPayload {
  to: string;
  recipientName: string;
  templateId:
    | 'approval-request'
    | 'finance-escalation'
    | 'rejection-notice'
    | 'high-risk-alert'
    | 'magic-link'
    | 'quote-confirmed';
  variables: Record<string, string | number | boolean>;
  idempotencyKey: string;
}

export interface ApprovalRoutingJobPayload extends BaseJobPayload {
  quoteId: string;
  repId: string;
  customerId: string;
  brs: number;
  approvalLevel: 'level_1' | 'level_2' | 'level_3';
  escalationDeadlineHours?: number;
}

export interface FulfillmentSplitJobPayload extends BaseJobPayload {
  quoteId: string;
  customerId?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface InvoiceGenerationJobPayload extends BaseJobPayload {
  invoiceId: string;
  quoteId?: string | null;
  billingScheduleId?: string | null;
  accountId?: string;
  amount?: string;
  currency?: string;
}

export interface BillingScheduleJobPayload extends BaseJobPayload {
  subscriptionId: string;
  scheduleDate: string;
  amount: string;
}

export interface ProrationCalculationJobPayload extends BaseJobPayload {
  subscriptionId: string;
  targetQuantity: number;
  effectiveDate: string;
}
