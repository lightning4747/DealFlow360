import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { quotes, quoteLines, lineComments, products, customers, users } from '@dealflow360/database';
import { eq, desc, inArray, or } from 'drizzle-orm';
import {
  CreateQuoteDto,
  CalculateQuoteDto,
  UpdateQuoteLineDto,
  CreateLineCommentDto,
} from '@dealflow360/types';
import { QuoteCalculationService } from './quote-calculation.service';
import { ApprovalRoutingService } from '../governance/approval-routing.service';
import * as crypto from 'crypto';

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    private readonly calcService: QuoteCalculationService,
    private readonly approvalRoutingService: ApprovalRoutingService,
  ) {}

  async calculateQuote(dto: CalculateQuoteDto) {
    return this.calcService.calculate(dto);
  }

  async findAllQuotes() {
    const list = await this.db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        status: quotes.status,
        totalAmount: quotes.totalAmount,
        costTotal: quotes.costTotal,
        grossMarginPct: quotes.grossMarginPct,
        brsScore: quotes.brsScore,
        createdAt: quotes.createdAt,
        customerId: quotes.customerId,
        customerName: customers.name,
        customerCompany: customers.company,
        customerTier: customers.tier,
        repId: quotes.repId,
        repName: users.name,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .leftJoin(users, eq(quotes.repId, users.id))
      .orderBy(desc(quotes.createdAt));

    return list;
  }

  async findAllCustomers() {
    const list = await this.db
      .select({
        id: customers.id,
        name: customers.name,
        company: customers.company,
        email: customers.email,
        tier: customers.tier,
        creditLimit: customers.creditLimit,
        location: customers.location,
      })
      .from(customers)
      .orderBy(customers.name);

    return list;
  }

  async createQuote(dto: CreateQuoteDto, user: any) {
    // 1. Fetch customer to identify tier
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, dto.customerId));
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // 2. Perform calculation
    const calcSummary = this.calcService.calculate({
      customerId: dto.customerId,
      customerTier: customer.tier as any,
      lines: dto.lines,
    });

    const quoteNumber = `Q-${Date.now().toString().slice(-4)}`;
    const repId = user?.id || user?.sub;

    // 3. Insert Quote
    const [newQuote] = await this.db
      .insert(quotes)
      .values({
        quoteNumber,
        repId,
        customerId: dto.customerId,
        status: 'draft',
        totalAmount: calcSummary.totalAmount.toFixed(2),
        costTotal: calcSummary.totalCost.toFixed(2),
        grossMarginPct: calcSummary.grossMarginPct.toFixed(2),
        brsScore: calcSummary.brsScore.toFixed(2),
        currentApprovalStep: 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // 4. Insert Quote Lines
    const linesToInsert = calcSummary.lines.map((l) => ({
      quoteId: newQuote.id,
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toFixed(2),
      unitCost: l.unitCost.toFixed(2),
      discountPct: l.discountPct.toFixed(2),
      appliedCeilingPct: l.appliedCeilingPct.toFixed(2),
      violationScore: l.violationScore.toFixed(4),
      lineTotal: l.lineTotal.toFixed(2),
      grossMargin: l.lineMarginAmount.toFixed(2),
      lineType: l.lineType as any,
    }));

    const insertedLines = await this.db.insert(quoteLines).values(linesToInsert).returning();

    return {
      quote: newQuote,
      lines: insertedLines,
      summary: calcSummary,
    };
  }

  async getQuoteById(quoteId: string) {
    const [quote] = await this.db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        repId: quotes.repId,
        customerId: quotes.customerId,
        status: quotes.status,
        blendedRiskScore: quotes.blendedRiskScore,
        brsScore: quotes.brsScore,
        currentApprovalStep: quotes.currentApprovalStep,
        totalAmount: quotes.totalAmount,
        costTotal: quotes.costTotal,
        grossMarginPct: quotes.grossMarginPct,
        counterDiscountPct: quotes.counterDiscountPct,
        expiresAt: quotes.expiresAt,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        customerName: customers.name,
        customerCompany: customers.company,
        customerTier: customers.tier,
        repName: users.name,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .leftJoin(users, eq(quotes.repId, users.id))
      .where(or(eq(quotes.id, quoteId), eq(quotes.quoteNumber, quoteId)));

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    const lines = await this.db
      .select({
        id: quoteLines.id,
        quoteId: quoteLines.quoteId,
        productId: quoteLines.productId,
        productName: products.name,
        category: products.category,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        unitCost: quoteLines.unitCost,
        discountPct: quoteLines.discountPct,
        appliedCeilingPct: quoteLines.appliedCeilingPct,
        violationScore: quoteLines.violationScore,
        lineTotal: quoteLines.lineTotal,
        grossMargin: quoteLines.grossMargin,
        lineType: quoteLines.lineType,
      })
      .from(quoteLines)
      .leftJoin(products, eq(quoteLines.productId, products.id))
      .where(eq(quoteLines.quoteId, quote.id));
    
    // Fetch comments for lines
    const lineIds = lines.map((l: any) => l.id);
    const comments = lineIds.length > 0 
      ? await this.db.select().from(lineComments).where(inArray(lineComments.quoteLineId, lineIds)).orderBy(desc(lineComments.createdAt))
      : [];

    return {
      ...quote,
      lines: lines.map((l: any) => ({
        ...l,
        comments: comments.filter((c: any) => c.quoteLineId === l.id),
      })),
    };
  }

  async updateQuoteLine(lineId: string, dto: UpdateQuoteLineDto) {
    const [existingLine] = await this.db.select().from(quoteLines).where(eq(quoteLines.id, lineId));
    if (!existingLine) {
      throw new NotFoundException(`Quote line ${lineId} not found`);
    }

    const newQty = dto.quantity !== undefined ? dto.quantity : existingLine.quantity;
    const newPrice = dto.unitPrice !== undefined ? dto.unitPrice : parseFloat(existingLine.unitPrice);
    const newDiscount = dto.discountPct !== undefined ? dto.discountPct : parseFloat(existingLine.discountPct);
    const unitCost = parseFloat(existingLine.unitCost || '0');

    const subtotal = newQty * newPrice;
    const lineTotal = subtotal * (1 - newDiscount / 100);
    const lineCost = newQty * unitCost;
    const grossMargin = lineTotal - lineCost;

    const [updatedLine] = await this.db
      .update(quoteLines)
      .set({
        quantity: newQty,
        unitPrice: newPrice.toFixed(2),
        discountPct: newDiscount.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        grossMargin: grossMargin.toFixed(2),
      })
      .where(eq(quoteLines.id, lineId))
      .returning();

    // Recompute parent quote
    await this.recalculateParentQuote(existingLine.quoteId);

    return updatedLine;
  }

  async addLineComment(lineId: string, dto: CreateLineCommentDto, author: { id?: string; name: string; role: string }) {
    const [line] = await this.db.select().from(quoteLines).where(eq(quoteLines.id, lineId));
    if (!line) {
      throw new NotFoundException(`Quote line ${lineId} not found`);
    }

    const [comment] = await this.db
      .insert(lineComments)
      .values({
        quoteLineId: lineId,
        authorId: author.id || null,
        authorName: author.name,
        authorRole: author.role,
        comment: dto.comment,
        suggestedDiscountPct: dto.suggestedDiscountPct ? dto.suggestedDiscountPct.toFixed(2) : null,
      })
      .returning();

    return comment;
  }

  private async recalculateParentQuote(quoteId: string) {
    const lines = await this.db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId));
    let totalAmount = 0;
    let costTotal = 0;

    for (const l of lines) {
      totalAmount += parseFloat(l.lineTotal);
      costTotal += parseFloat(l.unitCost || '0') * l.quantity;
    }

    const grossMarginAmount = totalAmount - costTotal;
    const grossMarginPct = totalAmount > 0 ? (grossMarginAmount / totalAmount) * 100 : 0;

    await this.db
      .update(quotes)
      .set({
        totalAmount: totalAmount.toFixed(2),
        costTotal: costTotal.toFixed(2),
        grossMarginPct: grossMarginPct.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId));
  }
}
