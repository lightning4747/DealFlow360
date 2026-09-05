import { calculateBRS, LineItemDiscountInput } from '../src/modules/governance/brs-calculator';

describe('BRS Calculation Engine & Governance Spec', () => {
  describe('calculateBRS Pure Algorithm', () => {
    it('should return BRS = 0 and approvalLevel = "none" when all lines are within ceiling', () => {
      const lines: LineItemDiscountInput[] = [
        {
          lineId: 'line-1',
          quantity: 2,
          unitPrice: 1000,
          appliedDiscountPct: 10,
          tierCeilingPct: 15,
        },
        {
          lineId: 'line-2',
          quantity: 1,
          unitPrice: 500,
          appliedDiscountPct: 5,
          tierCeilingPct: 10,
        },
      ];

      const result = calculateBRS(lines);
      expect(result.brs).toBe(0);
      expect(result.approvalLevel).toBe('none');
      expect(result.orderTotal).toBe(2275); // (2000 * 0.9) + (500 * 0.95) = 1800 + 475 = 2275
      expect(result.lineResults[0].violationScore).toBe(0);
      expect(result.lineResults[1].violationScore).toBe(0);
    });

    it('should route to Level 1 (Sales Manager) when BRS is between 1 and 25', () => {
      const lines: LineItemDiscountInput[] = [
        {
          lineId: 'line-1',
          quantity: 1,
          unitPrice: 1000,
          appliedDiscountPct: 12, // ceiling 10% -> violation = ((12 - 10)/10)*100 = 20%
          tierCeilingPct: 10,
        },
      ];

      const result = calculateBRS(lines);
      expect(result.brs).toBe(20);
      expect(result.approvalLevel).toBe('level_1');
      expect(result.lineResults[0].violationScore).toBe(20);
    });

    it('should route to Level 2 (Sales Manager + Finance) when BRS is between 26 and 50', () => {
      const lines: LineItemDiscountInput[] = [
        {
          lineId: 'line-1',
          quantity: 2,
          unitPrice: 1000,
          appliedDiscountPct: 15, // ceiling 10% -> violation = 50%
          tierCeilingPct: 10,
        },
        {
          lineId: 'line-2',
          quantity: 2,
          unitPrice: 1000,
          appliedDiscountPct: 10, // ceiling 10% -> violation = 0%
          tierCeilingPct: 10,
        },
      ];

      // line 1 total: 2000 * 0.85 = 1700
      // line 2 total: 2000 * 0.90 = 1800
      // total: 3500
      // line 1 weight: 1700 / 3500 = 0.485714
      // BRS = 50 * (1700/3500) = 24.29 -> let's increase discount to reach level 2:
      const lines2: LineItemDiscountInput[] = [
        {
          lineId: 'line-1',
          quantity: 1,
          unitPrice: 1000,
          appliedDiscountPct: 13.5, // ceiling 10% -> violation = 35%
          tierCeilingPct: 10,
        },
      ];
      const result2 = calculateBRS(lines2);
      expect(result2.brs).toBe(35);
      expect(result2.approvalLevel).toBe('level_2');
    });

    it('should route to Level 3 (Manager + Finance + Admin) when BRS > 50', () => {
      const lines: LineItemDiscountInput[] = [
        {
          lineId: 'line-1',
          quantity: 5,
          unitPrice: 1000,
          appliedDiscountPct: 20, // ceiling 10% -> violation = 100%
          tierCeilingPct: 10,
        },
      ];

      const result = calculateBRS(lines);
      expect(result.brs).toBe(100);
      expect(result.approvalLevel).toBe('level_3');
    });

    it('should throw error when no line items provided', () => {
      expect(() => calculateBRS([])).toThrow('At least one line item required');
    });

    it('should handle multi-line blended weighting accurately', () => {
      const lines: LineItemDiscountInput[] = [
        {
          lineId: 'line-hw',
          quantity: 1,
          unitPrice: 1000,
          appliedDiscountPct: 15, // ceiling 10 -> violation = 50%
          tierCeilingPct: 10,
        },
        {
          lineId: 'line-saas',
          quantity: 1,
          unitPrice: 1000,
          appliedDiscountPct: 20, // ceiling 20 -> violation = 0%
          tierCeilingPct: 20,
        },
      ];

      // line 1: 850, weight = 850 / 1650 = 0.51515
      // line 2: 800, weight = 800 / 1650 = 0.48485
      // BRS = 50 * (850 / 1650) = 25.76 -> level 1 (< 26)
      const result = calculateBRS(lines);
      expect(result.brs).toBe(25.76);
      expect(result.approvalLevel).toBe('level_1');
    });
  });
});
