import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerTierDto } from '@dealflow360/types';
import { db, customerTiers, CustomerTier } from '@dealflow360/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class CustomerTiersService {
  async create(dto: CreateCustomerTierDto) {
    const [record] = await db
      .insert(customerTiers)
      .values({
        name: dto.name,
        code: dto.code,
        maxDiscountPct: dto.maxDiscountPct.toString(),
        approvalThresholdPct: dto.approvalThresholdPct.toString(),
        description: dto.description ?? null,
      })
      .returning();

    return this.mapTier(record);
  }

  async findAll() {
    const list = await db.select().from(customerTiers);
    return list.map((t) => this.mapTier(t));
  }

  async update(id: string, dto: Partial<CreateCustomerTierDto>) {
    const [existing] = await db.select().from(customerTiers).where(eq(customerTiers.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundException({
        code: 'TIER_NOT_FOUND',
        message: `Customer tier with id ${id} was not found`,
        statusCode: 404,
      });
    }

    const payload: Record<string, any> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.code !== undefined) payload.code = dto.code;
    if (dto.maxDiscountPct !== undefined) payload.maxDiscountPct = dto.maxDiscountPct.toString();
    if (dto.approvalThresholdPct !== undefined) payload.approvalThresholdPct = dto.approvalThresholdPct.toString();
    if (dto.description !== undefined) payload.description = dto.description;

    const [updated] = await db
      .update(customerTiers)
      .set(payload)
      .where(eq(customerTiers.id, id))
      .returning();

    return this.mapTier(updated);
  }

  private mapTier(record: CustomerTier) {
    return {
      id: record.id,
      name: record.name,
      code: record.code,
      maxDiscountPct: parseFloat(record.maxDiscountPct),
      approvalThresholdPct: parseFloat(record.approvalThresholdPct),
      description: record.description,
      createdAt: record.createdAt,
    };
  }
}
