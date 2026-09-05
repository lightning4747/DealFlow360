import { Injectable, Logger } from '@nestjs/common';
import {
  CalculateQuoteDto,
  QuoteCalculationSummary,
  CalculatedLineResult,
} from '@dealflow360/types';
import { calculateBRS, LineItemDiscountInput } from '../governance/brs-calculator';

@Injectable()
export class QuoteCalculationService {
  private readonly logger = new Logger(QuoteCalculationService.name);

  // Category discount ceilings based on tier
  private readonly defaultCeilings: Record<string, Record<string, number>> = {
    bronze: { hardware: 10, subscription: 15, services: 5 },
    silver: { hardware: 15, subscription: 20, services: 10 },
    gold: { hardware: 20, subscription: 30, services: 15 },
    platinum: { hardware: 25, subscription: 40, services: 20 },
  };

  calculate(dto: CalculateQuoteDto): QuoteCalculationSummary {
    const tier = dto.customerTier || 'bronze';
    const ceilings = this.defaultCeilings[tier] || this.defaultCeilings.bronze;

    let subtotalAmount = 0;
    let totalDiscountAmount = 0;
    let totalAmount = 0;
    let totalCost = 0;

    const calculatedLines: CalculatedLineResult[] = [];
    const brsInputLines: LineItemDiscountInput[] = [];

    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      const appliedDiscountPct = dto.overrideDiscountPct !== undefined ? dto.overrideDiscountPct : line.discountPct;

      const lineSubtotal = Number((line.quantity * line.unitPrice).toFixed(2));
      const lineDiscountAmount = Number(((lineSubtotal * appliedDiscountPct) / 100).toFixed(2));
      const lineTotal = Number((lineSubtotal - lineDiscountAmount).toFixed(2));
      const lineCostTotal = Number((line.quantity * line.unitCost).toFixed(2));
      const lineMarginAmount = Number((lineTotal - lineCostTotal).toFixed(2));
      const lineMarginPct = lineTotal > 0 ? Number(((lineMarginAmount / lineTotal) * 100).toFixed(2)) : 0;

      // Determine product category ceiling (defaulting to hardware if unspecified)
      const tierCeilingPct = ceilings.hardware || 10;
      const isCeilingViolated = appliedDiscountPct > tierCeilingPct;
      const violationScore = isCeilingViolated
        ? Number(((appliedDiscountPct - tierCeilingPct) * (lineTotal / (lineSubtotal || 1))).toFixed(4))
        : 0;

      subtotalAmount += lineSubtotal;
      totalDiscountAmount += lineDiscountAmount;
      totalAmount += lineTotal;
      totalCost += lineCostTotal;

      calculatedLines.push({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        discountPct: appliedDiscountPct,
        subtotal: lineSubtotal,
        discountAmount: lineDiscountAmount,
        lineTotal,
        lineCostTotal,
        lineMarginAmount,
        lineMarginPct,
        appliedCeilingPct: tierCeilingPct,
        violationScore,
        isCeilingViolated,
        lineType: line.lineType,
      });

      brsInputLines.push({
        lineId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        appliedDiscountPct,
        tierCeilingPct,
      });
    }

    subtotalAmount = Number(subtotalAmount.toFixed(2));
    totalDiscountAmount = Number(totalDiscountAmount.toFixed(2));
    totalAmount = Number(totalAmount.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    const grossMarginAmount = Number((totalAmount - totalCost).toFixed(2));
    const grossMarginPct = totalAmount > 0 ? Number(((grossMarginAmount / totalAmount) * 100).toFixed(2)) : 0;

    let marginHealth: 'healthy' | 'caution' | 'critical' = 'healthy';
    if (grossMarginPct < 15) {
      marginHealth = 'critical';
    } else if (grossMarginPct < 30) {
      marginHealth = 'caution';
    }

    const brsResult = calculateBRS(brsInputLines);

    return {
      subtotalAmount,
      totalDiscountAmount,
      totalAmount,
      totalCost,
      grossMarginAmount,
      grossMarginPct,
      marginHealth,
      brsScore: brsResult.brs,
      requiresApproval: brsResult.approvalLevel !== 'none',
      approvalLevel: brsResult.approvalLevel,
      lines: calculatedLines,
    };
  }
}
