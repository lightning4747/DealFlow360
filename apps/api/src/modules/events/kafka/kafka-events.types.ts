export interface KafkaEventEnvelope<T = unknown> {
  eventId: string;
  producedAt: string;
  topic: string;
  eventType: string;
  schemaVersion: '1.0';
  source: string;
  data: T;
}

export interface QuoteSubmittedPayload {
  quoteId: string;
  brs: number;
  approvalRequired: boolean;
  approvalLevel: 1 | 2 | 3 | null;
}

export interface QuoteApprovedPayload {
  quoteId: string;
  approvalId: string;
  approverId: string;
  finalStatus: string;
  timestamp: string;
}

export interface QuoteReturnedPayload {
  quoteId: string;
  reason: string;
  returnedBy: string;
}

export interface QuoteCancelledPayload {
  quoteId: string;
  reason: string;
}

export interface ApprovalCreatedPayload {
  approvalId: string;
  quoteId: string;
  repId: string;
  brs: number;
  requiredLevel: 1 | 2 | 3;
  assignedRole: string;
}

export interface ApprovalStepAdvancedPayload {
  approvalId: string;
  quoteId: string;
  previousStep: number;
  currentStep: number;
  nextRoleRequired: string;
}

export interface ApprovalRejectedPayload {
  approvalId: string;
  quoteId: string;
  approverId: string;
  reason: string;
  timestamp: string;
}

export interface ApprovalEscalatedPayload {
  approvalId: string;
  quoteId: string;
  fromLevel: number;
  toLevel: number;
  reason: string;
}

export interface FulfillmentSplitCalculatedPayload {
  quoteId: string;
  totalDistanceKm: number;
  totalEstimatedShippingCost: number;
  hubCount: number;
  allocations: {
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    distanceKm: number;
    shippingCostEstimate: number;
    allocatedItems: {
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitCost: number;
    }[];
  }[];
  backorders: {
    productId: string;
    quantity: number;
    reason: string;
  }[];
  timestamp: string;
}

export interface StockReservedPayload {
  quoteId: string;
  reservations: {
    warehouseId: string;
    productId: string;
    reservedQuantity: number;
  }[];
  timestamp: string;
}
