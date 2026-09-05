import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from '@dealflow360/types';
import { db, products, Product } from '@dealflow360/database';
import { eq, ilike, and, count, or } from 'drizzle-orm';

@Injectable()
export class ProductsService {
  async create(dto: CreateProductDto) {
    const [record] = await db
      .insert(products)
      .values({
        sku: dto.sku,
        name: dto.name,
        category: dto.category as any,
        basePrice: dto.basePrice.toString(),
        unitCost: (dto.unitCost ?? 0).toString(),
        unit: dto.unit ?? 'each',
        taxRate: (dto.taxRate ?? 0).toString(),
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return this.mapProduct(record);
  }

  async findAll(query: { category?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.category) {
      conditions.push(eq(products.category, query.category as any));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(products.name, `%${query.search}%`),
          ilike(products.sku, `%${query.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalRecord?.total ?? 0);

    const items = await db
      .select()
      .from(products)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return {
      items: items.map((p) => this.mapProduct(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} was not found`,
        statusCode: 404,
      });
    }
    return this.mapProduct(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.category !== undefined) updatePayload.category = dto.category;
    if (dto.basePrice !== undefined) updatePayload.basePrice = dto.basePrice.toString();
    if (dto.unitCost !== undefined) updatePayload.unitCost = dto.unitCost.toString();
    if (dto.unit !== undefined) updatePayload.unit = dto.unit;
    if (dto.taxRate !== undefined) updatePayload.taxRate = dto.taxRate.toString();
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.isActive !== undefined) updatePayload.isActive = dto.isActive;

    const [updated] = await db
      .update(products)
      .set(updatePayload)
      .where(eq(products.id, id))
      .returning();

    return this.mapProduct(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));

    return { success: true, message: `Product ${id} deactivated` };
  }

  private mapProduct(record: Product) {
    return {
      id: record.id,
      sku: record.sku,
      name: record.name,
      category: record.category,
      basePrice: parseFloat(record.basePrice),
      unitCost: parseFloat(record.unitCost),
      unit: record.unit,
      taxRate: parseFloat(record.taxRate),
      description: record.description,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
