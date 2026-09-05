import { AnomalyDetectionService } from '../src/modules/analytics/anomaly-detection.service';

describe('Discount Anomaly Detection Engine (Phase 6)', () => {
  let anomalyService: AnomalyDetectionService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      execute: jest.fn(),
    };
    anomalyService = new AnomalyDetectionService(mockDb);
  });

  it('should return NONE when discount is within normal standard deviations (z < 2.0)', async () => {
    // Mean = 10, StdDev = 2, Current = 12 => z = (12 - 10) / 2 = 1.0
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ mean: 10, stddev: 2, count: 20 }],
    });

    const result = await anomalyService.evaluateDiscountAnomaly('rep-uuid-1', 12);
    expect(result.severity).toBe('NONE');
    expect(result.zScore).toBe(1.0);
    expect(result.currentDiscountPercentage).toBe(12);
    expect(result.historicalMean).toBe(10);
  });

  it('should return WARNING when discount exceeds 2 standard deviations (2.0 <= z < 3.0)', async () => {
    // Mean = 10, StdDev = 2, Current = 15 => z = (15 - 10) / 2 = 2.5
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ mean: 10, stddev: 2, count: 20 }],
    });

    const result = await anomalyService.evaluateDiscountAnomaly('rep-uuid-1', 15);
    expect(result.severity).toBe('WARNING');
    expect(result.zScore).toBe(2.5);
    expect(result.message).toContain('Warning: Discount is 2.5 standard deviations');
  });

  it('should return CRITICAL when discount exceeds 3 standard deviations (z >= 3.0)', async () => {
    // Mean = 10, StdDev = 2, Current = 18 => z = (18 - 10) / 2 = 4.0
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ mean: 10, stddev: 2, count: 20 }],
    });

    const result = await anomalyService.evaluateDiscountAnomaly('rep-uuid-1', 18);
    expect(result.severity).toBe('CRITICAL');
    expect(result.zScore).toBe(4.0);
    expect(result.message).toContain('Critical anomaly: Discount is 4 standard deviations');
  });

  it('should handle zero variance or small sample size with fallback threshold', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ mean: 10, stddev: 0, count: 2 }],
    });

    const result = await anomalyService.evaluateDiscountAnomaly('rep-uuid-2', 30);
    expect(result.severity).toBe('WARNING');
    expect(result.message).toContain('exceeds rep 30-day average (10.0%) by over 15%');
  });
});
