import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePriceListDto, BulkPriceListItemsDto } from '@dealflow360/types';
import { db, priceLists, priceListItems, PriceList, products } from '@dealflow360/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class PriceListsService {
  async create(dto: CreatePriceListDto) {
    const [record] = await db
      .insert(priceLists)
      .values({
        name: dto.name,
        tierId: dto.tierId ?? null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      })
      .returning();

    return this.mapPriceList(record);
  }

  async findAll() {
    const lists = await db.select().from(priceLists);
    return lists.map((pl) => this.mapPriceList(pl));
  }

  async addItems(priceListId: string, dto: BulkPriceListItemsDto) {
    await this.findOne(priceListId);

    for (const item of dto.items) {
      await db
        .insert(priceListItems)
        .values({
          priceListId,
          productId: item.productId,
          price: item.price.toString(),
        })
        .onConflictDoUpdate({
          target: [priceListItems.priceListId, priceListItems.productId],
          set: { price: item.price.toString() },
        });
    }

    const items = await db
      .select()
      .from(priceListItems)
      .where(eq(priceListItems.priceListId, priceListId));

    return {
      priceListId,
      updatedCount: dto.items.length,
      totalItems: items.length,
    };
  }

  async findOne(id: string) {
    const [priceList] = await db.select().from(priceLists).where(eq(priceLists.id, id)).limit(1);
    if (!priceList) {
      throw new NotFoundException({
        code: 'PRICE_LIST_NOT_FOUND',
        message: `Price list with id ${id} was not found`,
        statusCode: 404,
      });
    }

    const items = await db
      .select({
        id: priceListItems.id,
        productId: priceListItems.productId,
        price: priceListItems.price,
        productName: products.name,
        productSku: products.sku,
      })
      .from(priceListItems)
      .leftJoin(products, eq(priceListItems.productId, products.id))
      .where(eq(priceListItems.priceListId, id));

    return {
      ...this.mapPriceList(priceList),
      items: items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        price: parseFloat(it.price),
      })),
    };
  }

  private mapPriceList(record: PriceList) {
    return {
      id: record.id,
      name: record.name,
      tierId: record.tierId,
      effectiveDate: record.effectiveDate,
      createdAt: record.createdAt,
    };
  }
}
