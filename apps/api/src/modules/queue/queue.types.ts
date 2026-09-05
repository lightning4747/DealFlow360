export interface EmailNotificationJobPayload {
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

export interface ApprovalRoutingJobPayload {
  quoteId: string;
  repId: string;
  customerId: string;
  brs: number;
  approvalLevel: 'level_1' | 'level_2' | 'level_3';
  escalationDeadlineHours?: number;
}
