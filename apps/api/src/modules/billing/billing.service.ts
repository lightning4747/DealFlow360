import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { addDays } from 'date-fns';
import { DRIZZLE_DB } from '../database/database.module';
import {
  invoices,
  invoiceLines,
  subscriptions,
  billingSchedules,
  creditNotes,
  customers,
  quotes,
  products,
} from '@dealflow360/database';
import { ProrationEngine } from './proration.engine';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { KafkaService } from '../events/kafka/kafka.service';
import { QueueService } from '../queue/queue.service';
import {
  ModifySubscriptionQuantityDto,
  CancelSubscriptionDto,
  VoidInvoiceDto,
  SendInvoiceDto,
  ProrationPreviewQueryDto,
} from '@dealflow360/types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    private readonly scheduleGenerator: ScheduleGeneratorService,
    private readonly kafkaService: KafkaService,
    private readonly queueService: QueueService,
  ) {}

  private async generateCreditNoteNumber(tx: any): Promise<string> {
    const year = new Date().getUTCFullYear();
    try {
      await tx.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS billing.credit_note_seq_${year} START 1001;`));
      const res = await tx.execute(sql.raw(`SELECT nextval('billing.credit_note_seq_${year}') as seq;`));
      const seq = String(res[0]?.seq || Math.floor(1000 + Math.random() * 9000));
      return `CN-${year}-${seq.padStart(6, '0')}`;
    } catch {
      const rand = Math.floor(100000 + Math.random() * 900000);
      return `CN-${year}-${rand}`;
    }
  }

  private async generateInvoiceNumber(tx: any): Promise<string> {
    const year = new Date().getUTCFullYear();
    try {
      await tx.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS billing.invoice_seq_${year} START 1001;`));
      const res = await tx.execute(sql.raw(`SELECT nextval('billing.invoice_seq_${year}') as seq;`));
      const seq = String(res[0]?.seq || Math.floor(1000 + Math.random() * 9000));
      return `INV-${year}-${seq.padStart(6, '0')}`;
    } catch {
      const rand = Math.floor(100000 + Math.random() * 900000);
      return `INV-${year}-${rand}`;
    }
  }

  // ─── INVOICES ─────────────────────────────────────────────────────────────

  async listInvoices(params: { customerId?: string; status?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.customerId) {
      conditions.push(eq(invoices.customerId, params.customerId));
    }
    if (params.status) {
      conditions.push(eq(invoices.status, params.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.name,
        quoteId: invoices.quoteId,
        invoiceType: invoices.invoiceType,
        totalAmount: invoices.totalAmount,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        discountAmount: invoices.discountAmount,
        currency: invoices.currency,
        status: invoices.status,
        dueDate: invoices.dueDate,
        issuedAt: invoices.issuedAt,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql`count(*)` })
      .from(invoices)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    return {
      data: list,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      error: null,
    };
  }

  async getInvoiceById(id: string) {
    const [invoice] = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.name,
        quoteId: invoices.quoteId,
        invoiceType: invoices.invoiceType,
        totalAmount: invoices.totalAmount,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        discountAmount: invoices.discountAmount,
        currency: invoices.currency,
        status: invoices.status,
        dueDate: invoices.dueDate,
        issuedAt: invoices.issuedAt,
        paidAt: invoices.paidAt,
        voidedAt: invoices.voidedAt,
        voidReason: invoices.voidReason,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, id));

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const lines = await this.db
      .select({
        id: invoiceLines.id,
        productId: invoiceLines.productId,
        productName: products.name,
        description: invoiceLines.description,
        quantity: invoiceLines.quantity,
        unitPrice: invoiceLines.unitPrice,
        discountPct: invoiceLines.discountPct,
        totalPrice: invoiceLines.totalPrice,
        fulfillmentRequired: invoiceLines.fulfillmentRequired,
      })
      .from(invoiceLines)
      .leftJoin(products, eq(invoiceLines.productId, products.id))
      .where(eq(invoiceLines.invoiceId, id));

    const creditNotesList = await this.db
      .select()
      .from(creditNotes)
      .where(eq(creditNotes.invoiceId, id));

    return {
      ...invoice,
      items: lines,
      creditNotes: creditNotesList,
    };
  }

  async voidInvoice(id: string, dto: VoidInvoiceDto, actor?: { id?: string }) {
    const [invoice] = await this.db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === 'paid') {
      throw new UnprocessableEntityException('Cannot void paid invoice. Paid invoices require credit note issuance.');
    }

    if (invoice.status === 'voided') {
      throw new BadRequestException('Invoice is already voided');
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        status: 'voided',
        voidedAt: new Date(),
        voidReason: dto.voidReason,
        voidedBy: actor?.id || null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    await this.kafkaService.publishEvent('billing.events', 'invoice.voided', id, {
      invoiceId: id,
      voidReason: dto.voidReason,
      voidedAt: new Date().toISOString(),
    });

    return updated;
  }

  async sendInvoice(id: string, dto: SendInvoiceDto) {
    const [invoice] = await this.db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        status: invoice.status === 'draft' || invoice.status === 'pending' ? 'sent' : invoice.status,
        sentTo: dto.billingEmail,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    // Trigger email via queue
    await this.queueService.enqueueEmail({
      to: dto.billingEmail,
      recipientName: 'Customer Accounts Payable',
      templateId: 'quote-confirmed',
      variables: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        dueDate: invoice.dueDate.toISOString(),
      },
      idempotencyKey: `invoice-send-${id}-${Date.now()}`,
    });

    return updated;
  }

  async listInvoiceCreditNotes(invoiceId: string) {
    return this.db.select().from(creditNotes).where(eq(creditNotes.invoiceId, invoiceId));
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

  async listSubscriptions(params: { customerId?: string; status?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.customerId) {
      conditions.push(eq(subscriptions.customerId, params.customerId));
    }
    if (params.status) {
      conditions.push(eq(subscriptions.status, params.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await this.db
      .select({
        id: subscriptions.id,
        customerId: subscriptions.customerId,
        customerName: customers.name,
        productId: subscriptions.productId,
        productName: products.name,
        planName: subscriptions.planName,
        planInterval: subscriptions.billingInterval,
        quantity: subscriptions.quantity,
        unitPrice: subscriptions.unitPrice,
        discountPct: subscriptions.discountPct,
        mrr: subscriptions.mrr,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        nextBillingDate: subscriptions.nextBillingDate,
        autoRenew: subscriptions.autoRenew,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .leftJoin(customers, eq(subscriptions.customerId, customers.id))
      .leftJoin(products, eq(subscriptions.productId, products.id))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql`count(*)` })
      .from(subscriptions)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    return {
      data: list,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      error: null,
    };
  }

  async getSubscriptionById(id: string) {
    const [sub] = await this.db
      .select({
        id: subscriptions.id,
        customerId: subscriptions.customerId,
        customerName: customers.name,
        quoteId: subscriptions.quoteId,
        quoteLineId: subscriptions.quoteLineId,
        productId: subscriptions.productId,
        productName: products.name,
        planName: subscriptions.planName,
        planInterval: subscriptions.billingInterval,
        quantity: subscriptions.quantity,
        unitPrice: subscriptions.unitPrice,
        discountPct: subscriptions.discountPct,
        mrr: subscriptions.mrr,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        nextBillingDate: subscriptions.nextBillingDate,
        autoRenew: subscriptions.autoRenew,
        createdAt: subscriptions.createdAt,
        cancelledAt: subscriptions.cancelledAt,
        cancellationReason: subscriptions.cancellationReason,
      })
      .from(subscriptions)
      .leftJoin(customers, eq(subscriptions.customerId, customers.id))
      .leftJoin(products, eq(subscriptions.productId, products.id))
      .where(eq(subscriptions.id, id));

    if (!sub) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    const schedules = await this.getSubscriptionBillingSchedules(id);

    return {
      ...sub,
      schedules,
    };
  }

  async getSubscriptionBillingSchedules(subscriptionId: string) {
    return this.db
      .select()
      .from(billingSchedules)
      .where(eq(billingSchedules.subscriptionId, subscriptionId))
      .orderBy(billingSchedules.periodStart);
  }

  /**
   * Dry-run preview of proration calculations for hypothetical seat adjustment.
   */
  async previewProration(subscriptionId: string, query: ProrationPreviewQueryDto) {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
    if (!sub) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    const modDate = query.effectiveDate ? new Date(query.effectiveDate) : new Date();
    const currentStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();
    const currentEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : addDays(currentStart, 30);

    const oldQty = sub.quantity;
    const newQty = query.targetQuantity;
    const modType = newQty > oldQty ? 'upgrade' : newQty < oldQty ? 'downgrade' : 'downgrade';

    const calc = ProrationEngine.compute({
      subscriptionId,
      modificationType: modType,
      oldQuantity: oldQty,
      newQuantity: newQty,
      unitPrice: parseFloat(sub.unitPrice),
      discountPct: parseFloat(sub.discountPct || '0'),
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      modificationDate: modDate,
    });

    const effectiveDiscountMultiplier = 1.0 - parseFloat(sub.discountPct || '0') / 100.0;
    const newCycleMrr = newQty * parseFloat(sub.unitPrice) * effectiveDiscountMultiplier;

    return {
      subscriptionId,
      currentQuantity: oldQty,
      targetQuantity: newQty,
      effectiveDate: modDate.toISOString(),
      daysRemaining: calc.daysRemaining,
      daysInCycle: calc.daysInCycle,
      prorationFactor: calc.prorationFactor,
      estimatedCharge: calc.chargeAmount.toFixed(2),
      estimatedCredit: calc.creditAmount.toFixed(2),
      newCycleMrr: newCycleMrr.toFixed(2),
      creditNoteRequired: calc.creditNoteRequired,
      invoiceRequired: calc.invoiceRequired,
    };
  }

  /**
   * Mid-Cycle Seat Adjustment: updates quantity, executes proration, generates immediate
   * proration invoice or credit note, and regenerates forward billing schedules.
   */
  async modifySubscriptionQuantity(
    subscriptionId: string,
    dto: ModifySubscriptionQuantityDto,
    actor?: { id?: string },
  ) {
    if (dto.dryRun) {
      return this.previewProration(subscriptionId, {
        targetQuantity: dto.newQuantity,
        effectiveDate: dto.effectiveDate,
      });
    }

    const modDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

    return this.db.transaction(async (tx: any) => {
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .for('update');

      if (!sub) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      if (sub.status !== 'active') {
        throw new BadRequestException(`Cannot modify subscription in '${sub.status}' state`);
      }

      const oldQty = sub.quantity;
      const newQty = dto.newQuantity;

      if (oldQty === newQty) {
        throw new BadRequestException('New quantity must differ from current quantity');
      }

      const modType = newQty > oldQty ? 'upgrade' : 'downgrade';
      const currentStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();
      const currentEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : addDays(currentStart, 30);

      const proration = ProrationEngine.compute({
        subscriptionId,
        modificationType: modType,
        oldQuantity: oldQty,
        newQuantity: newQty,
        unitPrice: parseFloat(sub.unitPrice),
        discountPct: parseFloat(sub.discountPct || '0'),
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        modificationDate: modDate,
      });

      const effectiveDiscountMultiplier = 1.0 - parseFloat(sub.discountPct || '0') / 100.0;
      const newMonthlyAmount = newQty * parseFloat(sub.unitPrice) * effectiveDiscountMultiplier;

      let generatedInvoiceId: string | null = null;
      let generatedCreditNoteId: string | null = null;
      let actionTaken = 'none';

      // 1. If upgrade -> Generate immediate proration invoice
      if (proration.invoiceRequired && proration.chargeAmount > 0) {
        generatedInvoiceId = crypto.randomUUID();
        const invoiceNum = await this.generateInvoiceNumber(tx);
        await tx.insert(invoices).values({
          id: generatedInvoiceId,
          invoiceNumber: invoiceNum,
          customerId: sub.customerId,
          accountId: sub.accountId || sub.customerId,
          quoteId: sub.quoteId,
          invoiceType: 'proration',
          totalAmount: proration.chargeAmount.toFixed(2),
          subtotal: proration.chargeAmount.toFixed(2),
          taxAmount: '0.00',
          currency: sub.currency,
          status: 'pending',
          dueDate: addDays(new Date(), 14),
          issuedAt: new Date(),
        });

        await tx.insert(invoiceLines).values({
          id: crypto.randomUUID(),
          invoiceId: generatedInvoiceId,
          quoteLineId: sub.quoteLineId,
          productId: sub.productId,
          description: `Prorated expansion: ${sub.planName} (+${newQty - oldQty} seats for remainder of period)`,
          quantity: newQty - oldQty,
          unitPrice: sub.unitPrice,
          discountPct: sub.discountPct,
          totalPrice: proration.chargeAmount.toFixed(2),
          fulfillmentRequired: false,
        });

        actionTaken = 'invoice_generated';
      }

      // 2. If downgrade & credit qualifies -> Issue credit note
      if (proration.creditNoteRequired && proration.creditAmount >= 1.0) {
        generatedCreditNoteId = crypto.randomUUID();
        const cnNumber = await this.generateCreditNoteNumber(tx);
        await tx.insert(creditNotes).values({
          id: generatedCreditNoteId,
          creditNoteNumber: cnNumber,
          customerId: sub.customerId,
          accountId: sub.accountId || sub.customerId,
          subscriptionId: sub.id,
          amount: proration.creditAmount.toFixed(2),
          currency: sub.currency,
          reason: `Mid-cycle reduction: ${sub.planName} (-${oldQty - newQty} seats)`,
          status: 'issued',
          issuedBy: actor?.id || null,
          issuedAt: new Date(),
        });

        actionTaken = 'credit_note_issued';
      }

      // 3. Update subscription record
      await tx
        .update(subscriptions)
        .set({
          quantity: newQty,
          monthlyAmount: newMonthlyAmount.toFixed(2),
          amount: newMonthlyAmount.toFixed(2),
          mrr: newMonthlyAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      // 4. Invalidate future pending schedules and regenerate with new monthly amount
      await this.scheduleGenerator.regenerateSchedulesOnModification(
        tx,
        subscriptionId,
        modDate,
        newMonthlyAmount,
        sub.currency,
        (sub.billingInterval as any) || 'monthly',
      );

      return {
        subscriptionId,
        oldQuantity: oldQty,
        newQuantity: newQty,
        prorationFactor: proration.prorationFactor,
        prorationDeltaAmount:
          proration.chargeAmount > 0 ? proration.chargeAmount.toFixed(2) : proration.creditAmount.toFixed(2),
        actionTaken,
        invoiceId: generatedInvoiceId,
        creditNoteId: generatedCreditNoteId,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Cancels a subscription immediately or at the end of period.
   * On immediate cancellation, unused time is credited if credit >= $1.00.
   */
  async cancelSubscription(subscriptionId: string, dto: CancelSubscriptionDto, actor?: { id?: string }) {
    const modDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

    return this.db.transaction(async (tx: any) => {
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .for('update');

      if (!sub) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      if (sub.status === 'cancelled') {
        throw new BadRequestException('Subscription is already cancelled');
      }

      if (dto.cancellationType === 'end_of_period') {
        await tx
          .update(subscriptions)
          .set({
            autoRenew: false,
            cancellationReason: dto.reason,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscriptionId));

        return {
          subscriptionId,
          status: sub.status,
          autoRenew: false,
          effectiveCancellationDate: sub.currentPeriodEnd,
          message: 'Subscription set to expire at period end. No credit issued.',
        };
      }

      // Immediate cancellation
      const currentStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();
      const currentEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : addDays(currentStart, 30);

      const proration = ProrationEngine.compute({
        subscriptionId,
        modificationType: 'cancellation',
        oldQuantity: sub.quantity,
        newQuantity: 0,
        unitPrice: parseFloat(sub.unitPrice),
        discountPct: parseFloat(sub.discountPct || '0'),
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        modificationDate: modDate,
      });

      let creditNoteId: string | null = null;
      let creditIssued = 0;

      if (dto.issueCredit !== false && proration.creditNoteRequired && proration.creditAmount >= 1.0) {
        creditNoteId = crypto.randomUUID();
        const cnNumber = await this.generateCreditNoteNumber(tx);
        creditIssued = proration.creditAmount;

        await tx.insert(creditNotes).values({
          id: creditNoteId,
          creditNoteNumber: cnNumber,
          customerId: sub.customerId,
          accountId: sub.accountId || sub.customerId,
          subscriptionId: sub.id,
          amount: creditIssued.toFixed(2),
          currency: sub.currency,
          reason: `Immediate cancellation refund: ${dto.reason}`,
          status: 'issued',
          issuedBy: actor?.id || null,
          issuedAt: new Date(),
        });
      }

      // Mark subscription cancelled
      await tx
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
          autoRenew: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      // Invalidate all future pending billing schedules
      await tx
        .update(billingSchedules)
        .set({
          status: 'invalidated',
          invalidatedAt: new Date(),
        })
        .where(
          and(
            eq(billingSchedules.subscriptionId, subscriptionId),
            eq(billingSchedules.status, 'pending'),
          ),
        );

      return {
        subscriptionId,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        creditAmountIssued: creditIssued.toFixed(2),
        creditNoteId,
      };
    });
  }
}
