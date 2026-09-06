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
import { CustomerCounterProposalDto, CalculateQuoteDto } from '@dealflow360/types';
import { ApprovalRoutingService } from '../governance/approval-routing.service';
import { OrderBifurcationService } from '../billing/order-bifurcation.service';
import { QuoteCalculationService } from '../quotes/quote-calculation.service';
import * as crypto from 'crypto';

@Injectable()
export class PortalService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    @Inject(ApprovalRoutingService) private readonly approvalRoutingService: ApprovalRoutingService,
    @Inject(OrderBifurcationService) private readonly orderBifurcationService: OrderBifurcationService,
    @Inject(QuoteCalculationService) private readonly calcService: QuoteCalculationService,
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
    const [customer] = await this.db.select({ email: customers.email }).from(customers).where(eq(customers.id, quote.customerId));
    if (!customer || customer.email.toLowerCase() !== session.email.toLowerCase()) {
      throw new BadRequestException('Portal session is not authorized for this quote');
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
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, quote.customerId));
    if (!customer || customer.email.toLowerCase() !== session.email.toLowerCase()) {
      throw new BadRequestException('Portal session is not authorized for this quote');
    }
    if (quote.status !== 'sent' && quote.status !== 'under_negotiation') {
      throw new BadRequestException(`Quote cannot accept a counter proposal in status '${quote.status}'`);
    }

    const counterDiscount = dto.counterDiscountPct;

    const existingLines = await this.db
      .select({
        productId: quoteLines.productId,
        variantId: quoteLines.variantId,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        unitCost: quoteLines.unitCost,
        discountPct: quoteLines.discountPct,
        lineType: quoteLines.lineType,
      })
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quote.id));

    if (existingLines.length === 0) {
      throw new BadRequestException('Cannot negotiate a quote with no line items');
    }

    const calcDto: CalculateQuoteDto = {
      customerId: customer.id,
      customerTier: (customer.tier as any) || 'bronze',
      overrideDiscountPct: counterDiscount,
      lines: existingLines.map((l: any) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        unitCost: Number(l.unitCost || 0),
        discountPct: Number(l.discountPct),
        lineType: l.lineType || 'one_time',
      })),
    };

    const calcSummary = this.calcService.calculate(calcDto);

    const updatedQuote = await this.db.transaction(async (tx: any) => {
      const dbLines = await tx
        .select()
        .from(quoteLines)
        .where(eq(quoteLines.quoteId, quote.id));

      for (let i = 0; i < dbLines.length; i++) {
        const line = dbLines[i];
        const calcLine = calcSummary.lines[i];
        if (calcLine) {
          await tx
            .update(quoteLines)
            .set({
              discountPct: calcLine.discountPct.toFixed(2),
              appliedCeilingPct: calcLine.appliedCeilingPct.toFixed(2),
              violationScore: calcLine.violationScore.toFixed(4),
              lineTotal: calcLine.lineTotal.toFixed(2),
              grossMargin: calcLine.lineMarginAmount.toFixed(2),
            })
            .where(eq(quoteLines.id, line.id));
        }
      }

      const [result] = await tx
        .update(quotes)
        .set({
          status: 'under_negotiation',
          counterDiscountPct: counterDiscount.toFixed(2),
          totalAmount: calcSummary.totalAmount.toFixed(2),
          costTotal: calcSummary.totalCost.toFixed(2),
          grossMarginPct: calcSummary.grossMarginPct.toFixed(2),
          brsScore: calcSummary.brsScore.toFixed(2),
          blendedRiskScore: calcSummary.brsScore.toFixed(2),
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

    // Check if revised BRS or counter discount triggers governance approval
    if (calcSummary.requiresApproval) {
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
