import { differenceInDays, startOfDay } from 'date-fns';

export type ModificationType = 'upgrade' | 'downgrade' | 'cancellation';

export interface ProrationInput {
  subscriptionId: string;
  modificationType: ModificationType;
  oldQuantity: number;
  newQuantity: number; // Ignored for cancellation
  unitPrice: number;
  discountPct?: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  modificationDate: Date;
}

export interface ProrationResult {
  daysInCycle: number;
  daysRemaining: number;
  prorationFactor: number;
  oldAmount: number;
  newAmount: number;
  creditAmount: number; // > 0 means customer gets credit
  chargeAmount: number; // > 0 means customer is charged
  creditNoteRequired: boolean; // credit >= MINIMUM_CREDIT_THRESHOLD
  invoiceRequired: boolean; // charge > 0
}

export const MINIMUM_CREDIT_THRESHOLD = 1.0; // $1.00 minimum credit threshold

export class ProrationEngine {
  /**
   * Computes mathematical proration matching DF360-SPEC-006 §3.1 & §3.4.
   * Deterministic rounding to 2 decimal places.
   */
  static compute(input: ProrationInput): ProrationResult {
    const today = startOfDay(new Date(input.modificationDate));
    const periodStart = startOfDay(new Date(input.currentPeriodStart));
    const periodEnd = startOfDay(new Date(input.currentPeriodEnd));

    const daysInCycle = differenceInDays(periodEnd, periodStart);
    const daysRemaining = differenceInDays(periodEnd, today);

    if (daysInCycle <= 0) {
      throw new Error('Invalid billing cycle: currentPeriodEnd must be after currentPeriodStart');
    }

    if (daysRemaining < 0) {
      throw new Error('Modification date cannot be after billing period end');
    }

    const prorationFactor = Math.min(1.0, Math.max(0.0, daysRemaining / daysInCycle));
    const effectiveDiscountMultiplier = 1.0 - (input.discountPct || 0) / 100.0;
    const effectiveUnitPrice = input.unitPrice * effectiveDiscountMultiplier;

    const oldAmount = input.oldQuantity * effectiveUnitPrice;
    const newAmount =
      input.modificationType === 'cancellation'
        ? 0
        : input.newQuantity * effectiveUnitPrice;

    let rawCreditAmount = 0;
    let rawChargeAmount = 0;

    switch (input.modificationType) {
      case 'cancellation':
        rawCreditAmount = oldAmount * prorationFactor;
        break;

      case 'downgrade':
        // Delta between old and new amounts for the remaining portion of the period
        rawCreditAmount = Math.max(0, oldAmount - newAmount) * prorationFactor;
        break;

      case 'upgrade':
        rawChargeAmount = Math.max(0, newAmount - oldAmount) * prorationFactor;
        break;
    }

    // Precise financial currency rounding (2 decimal places)
    const creditAmount = Math.round(rawCreditAmount * 100) / 100;
    const chargeAmount = Math.round(rawChargeAmount * 100) / 100;

    return {
      daysInCycle,
      daysRemaining,
      prorationFactor: Math.round(prorationFactor * 10000) / 10000,
      oldAmount: Math.round(oldAmount * 100) / 100,
      newAmount: Math.round(newAmount * 100) / 100,
      creditAmount,
      chargeAmount,
      creditNoteRequired: creditAmount >= MINIMUM_CREDIT_THRESHOLD,
      invoiceRequired: chargeAmount > 0,
    };
  }
}
