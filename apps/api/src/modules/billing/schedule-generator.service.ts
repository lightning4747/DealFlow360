import { Injectable, Logger } from '@nestjs/common';
import { billingSchedules, subscriptions } from '@dealflow360/database';
import { eq, and, gte } from 'drizzle-orm';

export interface ScheduleMilestone {
  scheduleDate: Date;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

function getUTCDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUTCMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const origDay = d.getUTCDate();
  const targetMonth = d.getUTCMonth() + months;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  const maxDay = getUTCDaysInMonth(targetYear, normalizedMonth);
  const clampedDay = Math.min(origDay, maxDay);

  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 0, 0, 0, 0));
}

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name);

  /**
   * Computes forward billing schedule intervals with calendar month-end clamping in UTC
   * (e.g. Jan 31 -> Feb 28/29, Mar 31, Apr 30).
   */
  generateScheduleDates(
    startDate: Date,
    interval: 'monthly' | 'quarterly' | 'yearly',
    cycles?: number,
  ): ScheduleMilestone[] {
    const monthsPerInterval = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12;
    const totalCycles = cycles ?? (interval === 'monthly' ? 12 : interval === 'quarterly' ? 4 : 1);

    const startUTC = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const targetDayOfMonth = startUTC.getUTCDate();
    const isTargetMonthEnd =
      targetDayOfMonth === getUTCDaysInMonth(startUTC.getUTCFullYear(), startUTC.getUTCMonth()) ||
      targetDayOfMonth >= 28;

    const milestones: ScheduleMilestone[] = [];

    let currentStart = startUTC;
    for (let i = 0; i < totalCycles; i++) {
      const stepMonths = (i + 1) * monthsPerInterval;
      const targetMonthRaw = startUTC.getUTCMonth() + stepMonths;
      const targetYear = startUTC.getUTCFullYear() + Math.floor(targetMonthRaw / 12);
      const normalizedMonth = ((targetMonthRaw % 12) + 12) % 12;
      const maxDaysInTarget = getUTCDaysInMonth(targetYear, normalizedMonth);

      const targetDay = isTargetMonthEnd
        ? Math.min(targetDayOfMonth, maxDaysInTarget)
        : Math.min(targetDayOfMonth, maxDaysInTarget);

      const nextPeriodEnd = new Date(
        Date.UTC(targetYear, normalizedMonth, targetDay, 0, 0, 0, 0),
      );

      const periodStart = currentStart;
      const periodEnd = nextPeriodEnd;
      const scheduleDate = periodStart; // Invoiced at beginning of period
      const dueDate = periodStart;

      milestones.push({
        scheduleDate,
        periodStart,
        periodEnd,
        dueDate,
      });

      currentStart = nextPeriodEnd;
    }

    return milestones;
  }

  /**
   * Persists forward billing schedule records in DB within transaction.
   */
  async persistForwardSchedules(
    tx: any,
    subscriptionId: string,
    amount: string | number,
    currency: string,
    startDate: Date,
    interval: 'monthly' | 'quarterly' | 'yearly',
    cycles?: number,
  ) {
    const dates = this.generateScheduleDates(startDate, interval, cycles);
    const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : parseFloat(amount).toFixed(2);

    const values = dates.map((m) => ({
      subscriptionId,
      scheduleDate: m.scheduleDate,
      periodStart: m.periodStart,
      periodEnd: m.periodEnd,
      dueDate: m.dueDate,
      amount: formattedAmount,
      currency: currency || 'USD',
      status: 'pending',
      attemptCount: 0,
    }));

    if (values.length > 0) {
      await tx.insert(billingSchedules).values(values);
    }

    return values;
  }

  /**
   * Invalidates future pending schedules and regenerates with new amount.
   */
  async regenerateSchedulesOnModification(
    tx: any,
    subscriptionId: string,
    effectiveDate: Date,
    newAmount: string | number,
    currency: string,
    interval: 'monthly' | 'quarterly' | 'yearly',
  ) {
    const effDate = new Date(
      Date.UTC(
        effectiveDate.getUTCFullYear(),
        effectiveDate.getUTCMonth(),
        effectiveDate.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    // Invalidate future pending schedules
    await tx
      .update(billingSchedules)
      .set({
        status: 'invalidated',
        invalidatedAt: new Date(),
      })
      .where(
        and(
          eq(billingSchedules.subscriptionId, subscriptionId),
          eq(billingSchedules.status, 'pending'),
          gte(billingSchedules.periodStart, effDate),
        ),
      );

    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
    if (!sub) return;

    const startFrom = sub.nextBillingDate ? new Date(sub.nextBillingDate) : effDate;
    await this.persistForwardSchedules(tx, subscriptionId, newAmount, currency, startFrom, interval, 12);
  }
}
