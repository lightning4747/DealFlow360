import { PortalService } from '../src/modules/portal/portal.service';
import { RecommendationsService } from '../src/modules/recommendations/recommendations.service';
import { sqlClient } from '@dealflow360/database';

describe('Unit Test: Portal Token Verification & Recommendation Affinity Engine', () => {
  afterAll(async () => {
    await sqlClient.end();
  });

  it('should reject invalid or forged portal magic link tokens', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: async () => [],
        }),
      }),
    };

    const portalService = new PortalService(mockDb as any, {} as any);

    await expect(portalService.getSanitizedQuoteByToken('forged-token-xyz')).rejects.toThrow(
      'Magic link is invalid or has expired',
    );
  });

  it('should return empty recommendations array when no product ids provided', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: async () => [],
        }),
      }),
    };

    const recService = new RecommendationsService(mockDb as any);
    const results = await recService.getRecommendations({ productIds: [] as any });
    expect(results).toEqual([]);
  });
});
