import { QuoteCalculationService } from '../src/modules/quotes/quote-calculation.service';
import { CalculateQuoteDto } from '@dealflow360/types';

describe('Unit Test: Deal Studio Quote Calculation & Margin Modeling', () => {
  let calcService: QuoteCalculationService;

  beforeEach(() => {
    calcService = new QuoteCalculationService();
  });

  it('should accurately compute line subtotals, margins, and cost totals for multi-line quotes', () => {
    const dto: CalculateQuoteDto = {
      customerTier: 'silver',
      lines: [
        {
          productId: 'a0000000-0000-0000-0000-000000000001',
          quantity: 2,
          unitPrice: 4500, // Subtotal: 9000
          unitCost: 3000,  // Cost: 6000
          discountPct: 10, // Discount: 900 -> LineTotal: 8100, Margin: 2100 (25.93%)
          lineType: 'one_time',
        },
        {
          productId: 'a0000000-0000-0000-0000-000000000002',
          quantity: 1,
          unitPrice: 1200, // Subtotal: 1200
          unitCost: 750,   // Cost: 750
          discountPct: 5,  // Discount: 60 -> LineTotal: 1140, Margin: 390 (34.21%)
          lineType: 'one_time',
        },
      ],
    };

    const result = calcService.calculate(dto);

    expect(result.subtotalAmount).toBe(10200);
    expect(result.totalDiscountAmount).toBe(960);
    expect(result.totalAmount).toBe(9240);
    expect(result.totalCost).toBe(6750);
    expect(result.grossMarginAmount).toBe(2490);
    expect(result.grossMarginPct).toBe(26.95);
    expect(result.marginHealth).toBe('caution');
    expect(result.requiresApproval).toBe(false);
    expect(result.approvalLevel).toBe('none');
    expect(result.lines).toHaveLength(2);
  });

  it('should flag approval and BRS when discount exceeds ceiling for tier', () => {
    const dto: CalculateQuoteDto = {
      customerTier: 'bronze', // Bronze ceiling is 10% for hardware
      lines: [
        {
          productId: 'a0000000-0000-0000-0000-000000000001',
          quantity: 1,
          unitPrice: 10000,
          unitCost: 4000,
          discountPct: 25, // Exceeds 10% ceiling!
          lineType: 'one_time',
        },
      ],
    };

    const result = calcService.calculate(dto);

    expect(result.requiresApproval).toBe(true);
    expect(result.brsScore).toBeGreaterThan(0);
    expect(result.lines[0].isCeilingViolated).toBe(true);
  });
});
