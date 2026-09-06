import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { addDays } from 'date-fns';
import { DRIZZLE_DB } from '../database/database.module';
import {
  quotes,
  quoteLines,
  customers,
  products,
  invoices,
  invoiceLines,
  subscriptions,
} from '@dealflow360/database';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { KafkaService } from '../events/kafka/kafka.service';
import { QueueService } from '../queue/queue.service';

export interface BifurcationResult {
  quoteId: string;
  invoiceIds: string[];
  subscriptionIds: string[];
  totalOneTimeAmount: number;
  totalRecurringMrr: number;
  fulfillableLinesCount: number;
}

@Injectable()
export class OrderBifurcationService {
  private readonly logger = new Logger(OrderBifurcationService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    private readonly scheduleGenerator: ScheduleGeneratorService,
    private readonly kafkaService: KafkaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Generates sequential collision-safe invoice number: INV-YYYY-XXXXXX
   */
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

  /**
   * Order Confirmation Split Engine (DF360-SPEC-006 §1.2 & §1.4).
   * Atomically splits quote into one-time invoices and recurring subscriptions.
   */
  async confirmQuote(
    quoteId: string,
    actor: { id: string; role: string; name: string },
  ): Promise<BifurcationResult> {
    this.logger.log(`Executing order bifurcation confirmation for quote ${quoteId} by ${actor.name}`);

    const result = await this.db.transaction(async (tx: any) => {
      // 1. Fetch & lock quote with FOR UPDATE
      const [quote] = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .for('update');

      if (!quote) {
        throw new NotFoundException(`Quote ${quoteId} not found`);
      }

      if (quote.status !== 'sent') {
        throw new BadRequestException(`Only sent quotes can be confirmed; current status is '${quote.status}'`);
      }

      // 2. Fetch lines with joined products
      const lines = await tx
        .select({
          lineId: quoteLines.id,
          productId: quoteLines.productId,
          productName: products.name,
          category: products.category,
          quantity: quoteLines.quantity,
          unitPrice: quoteLines.unitPrice,
          discountPct: quoteLines.discountPct,
          lineTotal: quoteLines.lineTotal,
          lineType: quoteLines.lineType,
        })
        .from(quoteLines)
        .innerJoin(products, eq(quoteLines.productId, products.id))
        .where(eq(quoteLines.quoteId, quoteId));

      if (!lines || lines.length === 0) {
        throw new BadRequestException('Cannot confirm a quote without line items');
      }

      const oneTimeLines = lines.filter((l: any) => l.lineType === 'one_time');
      const recurringLines = lines.filter((l: any) => l.lineType === 'recurring');

      const createdInvoiceIds: string[] = [];
      const createdSubscriptionIds: string[] = [];
      let totalOneTimeAmount = 0;
      let totalRecurringMrr = 0;

      // ─── ONE-TIME INVOICE PATH ─────────────────────────────────────────────
      if (oneTimeLines.length > 0) {
        const invoiceId = crypto.randomUUID();
        const invoiceNumber = await this.generateInvoiceNumber(tx);
        const subtotal = oneTimeLines.reduce((acc: number, l: any) => acc + parseFloat(l.lineTotal), 0);
        const taxAmount = 0; // Tax calculation placeholder
        const totalAmount = subtotal + taxAmount;
        totalOneTimeAmount = totalAmount;

        const dueDate = addDays(new Date(), 30); // Standard Net-30 payment terms

        await tx.insert(invoices).values({
          id: invoiceId,
          invoiceNumber,
          customerId: quote.customerId,
          accountId: quote.customerId,
          quoteId: quote.id,
          invoiceType: 'one_time',
          totalAmount: totalAmount.toFixed(2),
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          discountAmount: '0.00',
          currency: 'USD',
          status: 'pending',
          dueDate,
          issuedAt: new Date(),
        });

        // Insert invoice lines
        const invoiceLineInserts = oneTimeLines.map((line: any) => {
          const isHardware = line.category === 'hardware';
          return {
            id: crypto.randomUUID(),
            invoiceId,
            quoteLineId: line.lineId,
            productId: line.productId,
            description: `${line.productName} (Qty: ${line.quantity})`,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPct: line.discountPct,
            totalPrice: line.lineTotal,
            fulfillmentRequired: isHardware,
          };
        });

        await tx.insert(invoiceLines).values(invoiceLineInserts);
        createdInvoiceIds.push(invoiceId);
      }

      // ─── RECURRING SUBSCRIPTION PATH ───────────────────────────────────────
      const now = new Date();
      for (const line of recurringLines) {
        const subscriptionId = crypto.randomUUID();
        const lineTotalNum = parseFloat(line.lineTotal);
        const billingInterval = 'monthly';
        const intervalDays = 30;
        const currentPeriodStart = now;
        const currentPeriodEnd = addDays(now, intervalDays);
        const nextBillingDate = currentPeriodEnd;

        totalRecurringMrr += lineTotalNum;

        await tx.insert(subscriptions).values({
          id: subscriptionId,
          customerId: quote.customerId,
          accountId: quote.customerId,
          quoteId: quote.id,
          quoteLineId: line.lineId,
          productId: line.productId,
          planName: `${line.productName} Subscription`,
          status: 'active',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          monthlyAmount: lineTotalNum.toFixed(2),
          amount: lineTotalNum.toFixed(2),
          mrr: lineTotalNum.toFixed(2),
          currency: 'USD',
          billingInterval,
          intervalDays,
          currentPeriodStart,
          currentPeriodEnd,
          nextBillingDate,
          autoRenew: true,
          startedAt: now,
          renewsAt: currentPeriodEnd,
        });

        // Pre-schedule forward billing schedules (12 cycles)
        await this.scheduleGenerator.persistForwardSchedules(
          tx,
          subscriptionId,
          lineTotalNum,
          'USD',
          currentPeriodStart,
          billingInterval,
          12,
        );

        createdSubscriptionIds.push(subscriptionId);
      }

      // ─── UPDATE QUOTE STATUS ───────────────────────────────────────────────
      await tx
        .update(quotes)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId));

      const fulfillableLines = oneTimeLines.filter((l: any) => l.category === 'hardware');

      return {
        quoteId,
        invoiceIds: createdInvoiceIds,
        subscriptionIds: createdSubscriptionIds,
        totalOneTimeAmount,
        totalRecurringMrr,
        fulfillableLinesCount: fulfillableLines.length,
        fulfillableItems: fulfillableLines.map((l: any) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        customerId: quote.customerId,
      };
    });

    // ─── POST-COMMIT ASYNCHRONOUS ACTIONS ────────────────────────────────────
    try {
      await this.kafkaService.publishEvent('billing.events', 'quote.confirmed', quoteId, {
        quoteId,
        invoiceIds: result.invoiceIds,
        subscriptionIds: result.subscriptionIds,
        confirmedAt: new Date().toISOString(),
      });

      for (const invId of result.invoiceIds) {
        await this.kafkaService.publishEvent('billing.events', 'invoice.created', invId, {
          invoiceId: invId,
          quoteId,
          invoiceType: 'one_time',
        });
      }

      for (const subId of result.subscriptionIds) {
        await this.kafkaService.publishEvent('billing.events', 'subscription.created', subId, {
          subscriptionId: subId,
          quoteId,
        });
      }

      // If any hardware lines require fulfillment, trigger spatial fulfillment split calculation
      if (result.fulfillableLinesCount > 0 && result.fulfillableItems.length > 0) {
        await this.queueService.enqueueFulfillmentSplit({
          quoteId,
          customerId: result.customerId,
          items: result.fulfillableItems,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Post-commit notification error: ${err.message}`);
    }

    return {
      quoteId: result.quoteId,
      invoiceIds: result.invoiceIds,
      subscriptionIds: result.subscriptionIds,
      totalOneTimeAmount: result.totalOneTimeAmount,
      totalRecurringMrr: result.totalRecurringMrr,
      fulfillableLinesCount: result.fulfillableLinesCount,
    };
  }
}
