import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { productRecommendations, products } from '@dealflow360/database';
import { inArray, eq } from 'drizzle-orm';
import { QueryRecommendationsDto } from '@dealflow360/types';

@Injectable()
export class RecommendationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getRecommendations(dto: QueryRecommendationsDto) {
    if (!dto.productIds || dto.productIds.length === 0) {
      return [];
    }

    const matchedRecs = await this.db
      .select({
        id: productRecommendations.id,
        sourceProductId: productRecommendations.sourceProductId,
        recommendedProductId: productRecommendations.recommendedProductId,
        relationshipType: productRecommendations.relationshipType,
        reason: productRecommendations.reason,
        confidenceScore: productRecommendations.confidenceScore,
        marginBoostPct: productRecommendations.marginBoostPct,
      })
      .from(productRecommendations)
      .where(inArray(productRecommendations.sourceProductId, dto.productIds));

    if (matchedRecs.length === 0) {
      return [];
    }

    const recProductIds = matchedRecs.map((r: any) => r.recommendedProductId);
    const recProducts = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, recProductIds));

    const productMap = new Map(recProducts.map((p: any) => [p.id, p]));

    return matchedRecs.map((r: any) => ({
      ...r,
      product: productMap.get(r.recommendedProductId) || null,
    }));
  }
}
