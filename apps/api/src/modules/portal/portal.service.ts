import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { magicLinks, quotes, quoteLines, products, lineComments, negotiationSessions } from '@dealflow360/database';
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

  async getSanitizedQuoteByToken(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Validate magic link token
    const [magicLink] = await this.db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, tokenHash), gt(magicLinks.expiresAt, new Date())));

    if (!magicLink) {
      throw new NotFoundException('Magic link is invalid or has expired');
    }

    // 2. Fetch Quote
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, magicLink.quoteId));
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
      .where(eq(quoteLines.quoteId, magicLink.quoteId));

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
      customerEmail: magicLink.email,
      lines: linesWithProducts,
    };
  }

  async submitCounterProposal(token: string, dto: CustomerCounterProposalDto) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [magicLink] = await this.db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, tokenHash), gt(magicLinks.expiresAt, new Date())));

    if (!magicLink) {
      throw new NotFoundException('Magic link is invalid or expired');
    }

    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, magicLink.quoteId));
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Update quote with counter discount
    const currentTotal = parseFloat(quote.totalAmount);
    const counterDiscount = dto.counterDiscountPct;
    const discountedTotal = (currentTotal * (1 - counterDiscount / 100)).toFixed(2);

    const [updatedQuote] = await this.db
      .update(quotes)
      .set({
        status: 'under_negotiation',
        counterDiscountPct: counterDiscount.toFixed(2),
        totalAmount: discountedTotal,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quote.id))
      .returning();

    // Create a negotiation session tracking record
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await this.db.insert(negotiationSessions).values({
      quoteId: quote.id,
      sessionToken,
      participantEmail: magicLink.email,
      participantName: dto.participantName,
      participantRole: 'customer',
      status: 'active',
    });

    // Check if revised discount triggers governance approval
    if (counterDiscount > 15) {
      // Auto-trigger approval escalation
      await this.approvalRoutingService.submitQuote(quote.id, {
        id: 'external-customer',
        role: 'customer',
        name: dto.participantName,
      });
    }

    return {
      success: true,
      message: 'Counter proposal submitted successfully',
      quote: updatedQuote,
    };
  }

  async confirmQuoteByToken(token: string, participantName?: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [magicLink] = await this.db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, tokenHash), gt(magicLinks.expiresAt, new Date())));

    if (!magicLink) {
      throw new NotFoundException('Magic link is invalid or expired');
    }

    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, magicLink.quoteId));
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const counterDiscount = parseFloat(quote.counterDiscountPct || '0');

    // FR-40 & FR-41: If customer counter discount or terms exceed threshold (>15%) AND quote is not yet approved
    if (counterDiscount > 15 && quote.status !== 'sent') {
      const submission = await this.approvalRoutingService.submitQuote(quote.id, {
        id: 'external-customer',
        role: 'customer',
        name: participantName || 'Authorized Customer',
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
      name: participantName || 'Authorized Customer',
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
