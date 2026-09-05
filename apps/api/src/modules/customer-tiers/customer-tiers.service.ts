import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerTierDto } from '@dealflow360/types';

@Injectable()
export class CustomerTiersService {
  private tiers: Map<string, any> = new Map([
    [
      'tier_standard',
      {
        id: 'tier_standard',
        name: 'Standard',
        code: 'STD',
        maxDiscountPct: 10,
        approvalThresholdPct: 5,
        description: 'Standard tier ceiling',
      },
    ],
    [
      'tier_gold',
      {
        id: 'tier_gold',
        name: 'Gold',
        code: 'GLD',
        maxDiscountPct: 25,
        approvalThresholdPct: 15,
        description: 'Gold enterprise customer tier',
      },
    ],
  ]);

  async create(dto: CreateCustomerTierDto) {
    const id = `tier_${Date.now()}`;
    const tier = { id, ...dto };
    this.tiers.set(id, tier);
    return tier;
  }

  async findAll() {
    return Array.from(this.tiers.values());
  }

  async update(id: string, dto: Partial<CreateCustomerTierDto>) {
    const tier = this.tiers.get(id);
    if (!tier) {
      throw new NotFoundException({
        code: 'TIER_NOT_FOUND',
        message: `Customer tier with id ${id} was not found`,
        statusCode: 404,
      });
    }
    const updated = { ...tier, ...dto };
    this.tiers.set(id, updated);
    return updated;
  }
}
