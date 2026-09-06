import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import {
  magicLinks,
  quotes,
  quoteLines,
  products,
  lineComments,
  negotiationSessions,
  customers,
} from '@dealflow360/database';
import { eq, and, gt } from 'drizzle-orm';
import { CustomerCounterProposalDto } from '@dealflow360/types';
import { ApprovalRoutingService } from '../governance/approval-routing.service';
import { OrderBifurcationService } from '../billing/order-bifurcation.service';
import * as crypto from 'crypto';

@Injectable()
export class PortalService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    @Inject(ApprovalRoutingService) private readonly approvalRoutingService: ApprovalRoutingService,
    @Inject(OrderBifurcationService) private readonly orderBifurcationService: OrderBifurcationService,
  ) {}

  private async resolveParticipantName(email: string, requestedName?: string) {
    const [customer] = await this.db
      .select({ name: customers.name })
      .from(customers)
      .where(eq(customers.email, email));
    return customer?.name || requestedName || 'Authorized Customer';
  }

  // Compatibility validation for callers migrating from token-based service APIs.
  // HTTP portal operations must use getSanitizedQuoteBySession instead.
  async getSanitizedQuoteByToken(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [magicLink] = await this.db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, tokenHash), gt(magicLinks.expiresAt, new Date())));

    if (!magicLink) {
      throw new NotFoundException('Magic link is invalid or has expired');
    }

    throw new BadRequestException('Portal token must be exchanged for a signed session');
  }

  async getSanitizedQuoteBySession(session: { quoteId: string; email: string }) {
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, session.quoteId));
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // 3. Fetch Lines (Sanitized: NO unitCost or internal margins exposed)
    const lines = await this.db
      .select({
        id: quoteLines.id,
        productId: quoteLines.productId,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        discountPct: quoteLines.discountPct,
        lineTotal: quoteLines.lineTotal,
        lineType: quoteLines.lineType,
      })
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, session.quoteId));

    // Get product details
    const linesWithProducts = await Promise.all(
      lines.map(async (l: any) => {
        const [prod] = await this.db
          .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            category: products.category,
            description: products.description,
          })
          .from(products)
          .where(eq(products.id, l.productId));
        return {
          ...l,
          product: prod || null,
        };
      })
    );

    return {
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        totalAmount: quote.totalAmount,
        expiresAt: quote.expiresAt,
        counterDiscountPct: quote.counterDiscountPct,
      },
      customerEmail: session.email,
      lines: linesWithProducts,
    };
  }

  async submitCounterProposalBySession(session: { quoteId: string; email: string }, dto: CustomerCounterProposalDto) {
    const participantName = await this.resolveParticipantName(session.email, dto.participantName);
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, session.quoteId));
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const counterDiscount = dto.counterDiscountPct;
    const updatedQuote = await this.db.transaction(async (tx: any) => {
      const lines = await tx
        .select()
        .from(quoteLines)
        .where(eq(quoteLines.quoteId, quote.id));
      if (lines.length === 0) {
        throw new BadRequestException('Cannot negotiate a quote with no line items');
      }

      let totalAmount = 0;
      let costTotal = 0;
      for (const line of lines) {
        const unitPrice = Number(line.unitPrice);
        const unitCost = Number(line.unitCost || 0);
        const lineTotal = Number((line.quantity * unitPrice * (1 - counterDiscount / 100)).toFixed(2));
        const grossMargin = Number((lineTotal - line.quantity * unitCost).toFixed(2));
        totalAmount += lineTotal;
        costTotal += line.quantity * unitCost;
        await tx
          .update(quoteLines)
          .set({
            discountPct: counterDiscount.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            grossMargin: grossMargin.toFixed(2),
          })
          .where(eq(quoteLines.id, line.id));
      }

      totalAmount = Number(totalAmount.toFixed(2));
      costTotal = Number(costTotal.toFixed(2));
      const grossMarginPct = totalAmount > 0
        ? Number((((totalAmount - costTotal) / totalAmount) * 100).toFixed(2))
        : 0;

      const [result] = await tx
        .update(quotes)
        .set({
          status: 'under_negotiation',
          counterDiscountPct: counterDiscount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          costTotal: costTotal.toFixed(2),
          grossMarginPct: grossMarginPct.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quote.id))
        .returning();
      return result;
    });

    // Create a negotiation session tracking record
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await this.db.insert(negotiationSessions).values({
      quoteId: quote.id,
      sessionToken,
      participantEmail: session.email,
      participantName,
      participantRole: 'customer',
      status: 'active',
    });

    // Check if revised discount triggers governance approval
    if (counterDiscount > 15) {
      // Auto-trigger approval escalation
      await this.approvalRoutingService.submitQuote(quote.id, {
        id: 'external-customer',
        role: 'customer',
        name: participantName,
      });
    }

    return {
      success: true,
      message: 'Counter proposal submitted successfully',
      quote: updatedQuote,
    };
  }

  async confirmQuoteBySession(session: { quoteId: string; email: string }, participantName?: string) {
    const resolvedParticipantName = await this.resolveParticipantName(session.email, participantName);
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, session.quoteId));
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const counterDiscount = parseFloat(quote.counterDiscountPct || '0');

    // FR-40 & FR-41: If customer counter discount or terms exceed threshold (>15%) AND quote is not yet approved
    if (counterDiscount > 15 && quote.status !== 'sent') {
      const submission = await this.approvalRoutingService.submitQuote(quote.id, {
        id: 'external-customer',
        role: 'customer',
        name: resolvedParticipantName,
      });
      return {
        success: true,
        status: 'pending_approval',
        message: 'Order terms submitted for governance approval.',
        quote: submission.quote || quote,
      };
    }

    // Otherwise within threshold or already approved -> quote is confirmed and ready for fulfillment
    // Trigger atomic order confirmation bifurcation (generates one-time invoices and subscriptions)
    const bifurcationResult = await this.orderBifurcationService.confirmQuote(quote.id, {
      id: 'customer-portal',
      role: 'customer',
      name: resolvedParticipantName,
    });

    const [confirmedQuote] = await this.db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quote.id));

    return {
      success: true,
      status: 'confirmed',
      message: 'Quotation confirmed! Order is now approved and ready for warehouse fulfillment.',
      quote: confirmedQuote,
      bifurcation: bifurcationResult,
    };
  }

}
