import { OrderBifurcationService } from '../src/modules/billing/order-bifurcation.service';
import { BillingService } from '../src/modules/billing/billing.service';
import { ScheduleGeneratorService } from '../src/modules/billing/schedule-generator.service';

describe('Phase 5 Integration & Service Tests: Order Bifurcation & Invoicing Lifecycle', () => {
  let mockDb: any;
  let mockKafka: any;
  let mockQueue: any;
  let scheduleGen: ScheduleGeneratorService;
  let bifurcationService: OrderBifurcationService;
  let billingService: BillingService;

  const sampleQuoteId = 'q-1001-hybrid';
  const sampleCustomerId = 'cust-5001';

  beforeEach(() => {
    scheduleGen = new ScheduleGeneratorService();

    mockKafka = {
      publishEvent: jest.fn().mockResolvedValue(true),
    };

    mockQueue = {
      enqueueEmail: jest.fn().mockResolvedValue(true),
      enqueueFulfillmentSplit: jest.fn().mockResolvedValue(true),
    };

    // In-memory state mock for database queries and transaction
    const inMemoryInvoices: any[] = [];
    const inMemoryInvoiceLines: any[] = [];
    const inMemorySubscriptions: any[] = [];
    const inMemorySchedules: any[] = [];
    const inMemoryCreditNotes: any[] = [];

    const mockQuoteRow = {
      id: sampleQuoteId,
      quoteNumber: 'Q-2026-0010',
      customerId: sampleCustomerId,
      status: 'draft',
      totalAmount: '15000.00',
    };

    const mockQuoteLines = [
      {
        lineId: 'line-hw-1',
        productId: 'prod-hw-rack',
        productName: 'Server Rack 42U',
        category: 'hardware',
        quantity: 1,
        unitPrice: '10000.00',
        discountPct: '0.00',
        lineTotal: '10000.00',
        lineType: 'one_time',
      },
      {
        lineId: 'line-saas-1',
        productId: 'prod-saas-seats',
        productName: 'Enterprise SaaS Seats',
        category: 'subscription',
        quantity: 100,
        unitPrice: '50.00',
        discountPct: '0.00',
        lineTotal: '5000.00',
        lineType: 'recurring',
      },
    ];

    const createQueryChain = (result: any) => ({
      where: jest.fn().mockReturnValue({
        for: jest.fn().mockReturnValue(result),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockReturnValue(result),
          }),
        }),
        limit: jest.fn().mockReturnValue(result),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
      }),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue(result),
      offset: jest.fn().mockReturnValue(result),
      orderBy: jest.fn().mockReturnThis(),
    });

    const txMock: any = {
      select: jest.fn((fields) => ({
        from: jest.fn((table) => {
          return {
            where: jest.fn((condition) => {
              return {
                for: jest.fn().mockReturnValue([mockQuoteRow]),
                leftJoin: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnValue(mockQuoteLines),
              };
            }),
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue(mockQuoteLines),
            }),
          };
        }),
      })),
      insert: jest.fn((table) => ({
        values: jest.fn(async (vals) => {
          const arr = Array.isArray(vals) ? vals : [vals];
          if (table._?.name === 'invoices' || (table as any).toString().includes('invoices')) {
            inMemoryInvoices.push(...arr);
          } else if (table._?.name === 'subscriptions' || (table as any).toString().includes('subscriptions')) {
            inMemorySubscriptions.push(...arr);
          } else if (table._?.name === 'invoice_lines' || (table as any).toString().includes('invoice_lines')) {
            inMemoryInvoiceLines.push(...arr);
          } else if (table._?.name === 'billing_schedules' || (table as any).toString().includes('billing_schedules')) {
            inMemorySchedules.push(...arr);
          } else if (table._?.name === 'credit_notes' || (table as any).toString().includes('credit_notes')) {
            inMemoryCreditNotes.push(...arr);
          }
          return arr;
        }),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([{ ...mockQuoteRow, status: 'confirmed' }]),
          }),
        })),
      })),
      execute: jest.fn().mockResolvedValue([{ seq: '1001' }]),
    };

    mockDb = {
      transaction: jest.fn(async (callback) => callback(txMock)),
      select: jest.fn((fields) => ({
        from: jest.fn((table) => ({
          leftJoin: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn((cond) => ({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockReturnValue(inMemoryInvoices),
              }),
            }),
            limit: jest.fn().mockReturnValue(inMemoryInvoices),
            offset: jest.fn().mockReturnValue(inMemoryInvoices),
          })),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn().mockReturnValue([
              { id: 'inv-1', status: 'voided', voidReason: 'Customer canceled deal' },
            ]),
          })),
        })),
      })),
      insert: txMock.insert,
      _state: {
        inMemoryInvoices,
        inMemoryInvoiceLines,
        inMemorySubscriptions,
        inMemorySchedules,
        inMemoryCreditNotes,
        mockQuoteRow,
        mockQuoteLines,
      },
    };

    bifurcationService = new OrderBifurcationService(
      mockDb,
      scheduleGen,
      mockKafka,
      mockQueue,
    );

    billingService = new BillingService(
      mockDb,
      scheduleGen,
      mockKafka,
      mockQueue,
    );
  });

  it('should atomically bifurcate a hybrid quote into one-time invoice and recurring subscription with forward schedules', async () => {
    const result = await bifurcationService.confirmQuote(sampleQuoteId, {
      id: 'rep-1',
      role: 'sales_rep',
      name: 'Jane Doe',
    });

    expect(result.quoteId).toBe(sampleQuoteId);
    expect(result.invoiceIds).toHaveLength(1);
    expect(result.subscriptionIds).toHaveLength(1);
    expect(result.totalOneTimeAmount).toBe(10000.0);
    expect(result.totalRecurringMrr).toBe(5000.0);
    expect(result.fulfillableLinesCount).toBe(1);

    // Verify Kafka events published
    expect(mockKafka.publishEvent).toHaveBeenCalledWith(
      'billing.events',
      'quote.confirmed',
      sampleQuoteId,
      expect.objectContaining({ quoteId: sampleQuoteId }),
    );
    expect(mockKafka.publishEvent).toHaveBeenCalledWith(
      'billing.events',
      'invoice.created',
      result.invoiceIds[0],
      expect.anything(),
    );
    expect(mockKafka.publishEvent).toHaveBeenCalledWith(
      'billing.events',
      'subscription.created',
      result.subscriptionIds[0],
      expect.anything(),
    );

    // Verify spatial split queued for hardware line
    expect(mockQueue.enqueueFulfillmentSplit).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: sampleQuoteId,
        customerId: sampleCustomerId,
        items: [{ productId: 'prod-hw-rack', quantity: 1 }],
      }),
    );
  });

  it('should enforce invoice voiding state transition guards', async () => {
    // 1. Mock paid invoice -> should reject voiding with 422
    const paidDbMock: any = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockReturnValue([{ id: 'inv-paid-1', status: 'paid' }]),
        })),
      })),
    };
    const paidBillingService = new BillingService(paidDbMock, scheduleGen, mockKafka, mockQueue);

    await expect(
      paidBillingService.voidInvoice('inv-paid-1', { voidReason: 'Requested cancellation' }),
    ).rejects.toThrow('Cannot void paid invoice');

    // 2. Mock pending invoice -> should succeed
    const pendingDbMock: any = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockReturnValue([{ id: 'inv-pending-1', status: 'pending' }]),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn().mockReturnValue([
              { id: 'inv-pending-1', status: 'voided', voidReason: 'Order renegotiated' },
            ]),
          })),
        })),
      })),
    };
    const pendingBillingService = new BillingService(pendingDbMock, scheduleGen, mockKafka, mockQueue);
    const voided = await pendingBillingService.voidInvoice('inv-pending-1', {
      voidReason: 'Order renegotiated',
    });

    expect(voided.status).toBe('voided');
    expect(mockKafka.publishEvent).toHaveBeenCalledWith(
      'billing.events',
      'invoice.voided',
      'inv-pending-1',
      expect.anything(),
    );
  });
});
