export interface LineItemDiscountInput {
  lineId: string;
  quantity: number;
  unitPrice: number;
  appliedDiscountPct: number;
  tierCeilingPct: number;
}

export interface BrsCalculationResult {
  brs: number;
  approvalLevel: 'none' | 'level_1' | 'level_2' | 'level_3';
  orderTotal: number;
  lineResults: Array<{
    lineId: string;
    lineTotal: number;
    lineWeight: number;
    violationScore: number;
  }>;
}

export function calculateBRS(lines: LineItemDiscountInput[]): BrsCalculationResult {
  if (!lines || lines.length === 0) {
    throw new Error('At least one line item required');
  }

  // Compute line totals
  const lineTotals = lines.map((l) => {
    const total = Number((l.quantity * l.unitPrice * (1 - l.appliedDiscountPct / 100)).toFixed(2));
    return {
      ...l,
      total,
    };
  });

  const orderTotal = Number(lineTotals.reduce((sum, l) => sum + l.total, 0).toFixed(2));
  if (orderTotal <= 0) {
    throw new Error('Order total must be positive');
  }

  let brsAccumulator = 0;
  const lineResults = lineTotals.map((l) => {
    const violationScore =
      l.tierCeilingPct > 0
        ? Math.max(0, ((l.appliedDiscountPct - l.tierCeilingPct) / l.tierCeilingPct) * 100)
        : l.appliedDiscountPct > 0
          ? 100
          : 0;

    const lineWeight = l.total / orderTotal;
    brsAccumulator += violationScore * lineWeight;

    return {
      lineId: l.lineId,
      lineTotal: l.total,
      lineWeight: Number(lineWeight.toFixed(6)),
      violationScore: Number(violationScore.toFixed(4)),
    };
  });

  const finalBrs = Number(brsAccumulator.toFixed(2));
  let approvalLevel: 'none' | 'level_1' | 'level_2' | 'level_3' = 'none';

  if (finalBrs > 50) {
    approvalLevel = 'level_3';
  } else if (finalBrs >= 26) {
    approvalLevel = 'level_2';
  } else if (finalBrs >= 1) {
    approvalLevel = 'level_1';
  }

  return { brs: finalBrs, approvalLevel, orderTotal, lineResults };
}
