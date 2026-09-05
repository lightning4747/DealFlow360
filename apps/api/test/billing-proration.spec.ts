import { ProrationEngine, MINIMUM_CREDIT_THRESHOLD } from '../src/modules/billing/proration.engine';
import { ScheduleGeneratorService } from '../src/modules/billing/schedule-generator.service';

describe('Phase 5 Unit Tests: Proration & Schedule Engine', () => {
  describe('ProrationEngine Mathematical Calculations', () => {
    /**
     * Worked Example from DF360-SPEC-006 §3.2:
     * Subscription: $300/month, billed monthly (30-day cycle)
     * Period: Day 1 to Day 30
     * Cancelled on Day 10 (daysRemaining = 20)
     * Credit = (20 / 30) * 300 = $200.00
     */
    it('should accurately compute cancellation credit matching worked example ($200.00)', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-10-01T00:00:00.000Z'); // 30 days
      const modDate = new Date('2026-09-11T00:00:00.000Z'); // 20 days remaining

      const result = ProrationEngine.compute({
        subscriptionId: 'sub-1',
        modificationType: 'cancellation',
        oldQuantity: 1,
        newQuantity: 0,
        unitPrice: 300,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        modificationDate: modDate,
      });

      expect(result.daysInCycle).toBe(30);
      expect(result.daysRemaining).toBe(20);
      expect(result.creditAmount).toBe(200.0);
      expect(result.chargeAmount).toBe(0);
      expect(result.creditNoteRequired).toBe(true);
      expect(result.invoiceRequired).toBe(false);
    });

    /**
     * Worked Example from DF360-SPEC-006 §3.3:
     * Subscription: 5 seats * $50/seat = $250/month, billed monthly (30-day cycle)
     * Upgraded to: 8 seats on Day 15 (daysRemaining = 15)
     * Prorated Upcharge = ($400 - $250) * (15 / 30) = $75.00
     */
    it('should accurately compute seat upgrade upcharge matching worked example ($75.00)', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-10-01T00:00:00.000Z'); // 30 days
      const modDate = new Date('2026-09-16T00:00:00.000Z'); // 15 days remaining

      const result = ProrationEngine.compute({
        subscriptionId: 'sub-2',
        modificationType: 'upgrade',
        oldQuantity: 5,
        newQuantity: 8,
        unitPrice: 50,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        modificationDate: modDate,
      });

      expect(result.daysInCycle).toBe(30);
      expect(result.daysRemaining).toBe(15);
      expect(result.prorationFactor).toBe(0.5);
      expect(result.oldAmount).toBe(250.0);
      expect(result.newAmount).toBe(400.0);
      expect(result.chargeAmount).toBe(75.0);
      expect(result.creditAmount).toBe(0);
      expect(result.invoiceRequired).toBe(true);
      expect(result.creditNoteRequired).toBe(false);
    });

    it('should suppress credit note issuance when credit is below $1.00 threshold', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-10-01T00:00:00.000Z');
      // 1 day remaining out of 30 for a $15 plan -> credit = 1/30 * 15 = $0.50 (< $1.00)
      const modDate = new Date('2026-09-30T00:00:00.000Z');

      const result = ProrationEngine.compute({
        subscriptionId: 'sub-3',
        modificationType: 'cancellation',
        oldQuantity: 1,
        newQuantity: 0,
        unitPrice: 15,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        modificationDate: modDate,
      });

      expect(result.creditAmount).toBe(0.5);
      expect(result.creditAmount).toBeLessThan(MINIMUM_CREDIT_THRESHOLD);
      expect(result.creditNoteRequired).toBe(false);
    });

    it('should incorporate discount percentages into prorated amounts', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-10-01T00:00:00.000Z');
      const modDate = new Date('2026-09-16T00:00:00.000Z'); // 15 days (0.5 factor)

      // 10 seats @ $100 with 20% discount -> effective unit price = $80
      // Upgrade to 15 seats (+5 seats * $80 = $400 delta) -> 0.5 * 400 = $200
      const result = ProrationEngine.compute({
        subscriptionId: 'sub-4',
        modificationType: 'upgrade',
        oldQuantity: 10,
        newQuantity: 15,
        unitPrice: 100,
        discountPct: 20,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        modificationDate: modDate,
      });

      expect(result.chargeAmount).toBe(200.0);
      expect(result.oldAmount).toBe(800.0);
      expect(result.newAmount).toBe(1200.0);
    });

    it('should reject invalid date boundaries', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-10-01T00:00:00.000Z');
      const pastDate = new Date('2026-10-05T00:00:00.000Z');

      expect(() => {
        ProrationEngine.compute({
          subscriptionId: 'sub-5',
          modificationType: 'downgrade',
          oldQuantity: 10,
          newQuantity: 5,
          unitPrice: 100,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          modificationDate: pastDate,
        });
      }).toThrow('Modification date cannot be after billing period end');
    });
  });

  describe('ScheduleGeneratorService Calendar Clamping', () => {
    let generator: ScheduleGeneratorService;

    beforeEach(() => {
      generator = new ScheduleGeneratorService();
    });

    it('should generate 12 monthly milestones with month-end clamping from Jan 31', () => {
      const start = new Date('2026-01-31T00:00:00.000Z');
      const schedules = generator.generateScheduleDates(start, 'monthly', 12);

      expect(schedules).toHaveLength(12);

      // Cycle 1: Jan 31 -> Feb 28 (2026 is non-leap year)
      expect(schedules[0].periodStart.getUTCDate()).toBe(31);
      expect(schedules[0].periodEnd.getUTCDate()).toBe(28);
      expect(schedules[0].periodEnd.getUTCMonth()).toBe(1); // February (0-indexed)

      // Cycle 2: Feb 28 -> Mar 31
      expect(schedules[1].periodStart.getUTCDate()).toBe(28);
      expect(schedules[1].periodEnd.getUTCDate()).toBe(31);
      expect(schedules[1].periodEnd.getUTCMonth()).toBe(2); // March

      // Cycle 3: Mar 31 -> Apr 30
      expect(schedules[2].periodStart.getUTCDate()).toBe(31);
      expect(schedules[2].periodEnd.getUTCDate()).toBe(30);
      expect(schedules[2].periodEnd.getUTCMonth()).toBe(3); // April
    });

    it('should generate 4 quarterly milestones correctly', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const schedules = generator.generateScheduleDates(start, 'quarterly', 4);

      expect(schedules).toHaveLength(4);
      expect(schedules[0].periodStart.getUTCMonth()).toBe(0); // Jan
      expect(schedules[0].periodEnd.getUTCMonth()).toBe(3); // Apr
      expect(schedules[1].periodStart.getUTCMonth()).toBe(3); // Apr
      expect(schedules[1].periodEnd.getUTCMonth()).toBe(6); // Jul
    });
  });
});
