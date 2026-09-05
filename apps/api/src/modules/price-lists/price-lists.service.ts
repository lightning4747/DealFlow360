import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePriceListDto, BulkPriceListItemsDto } from '@dealflow360/types';

@Injectable()
export class PriceListsService {
  private priceLists: Map<string, any> = new Map();
  private priceListItems: Map<string, Map<string, number>> = new Map();

  async create(dto: CreatePriceListDto) {
    const id = `plist_${Date.now()}`;
    const priceList = {
      id,
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.priceLists.set(id, priceList);
    this.priceListItems.set(id, new Map());
    return priceList;
  }

  async addItems(priceListId: string, dto: BulkPriceListItemsDto) {
    const priceList = this.priceLists.get(priceListId);
    if (!priceList) {
      throw new NotFoundException({
        code: 'PRICE_LIST_NOT_FOUND',
        message: `Price list with id ${priceListId} was not found`,
        statusCode: 404,
      });
    }

    let itemsMap = this.priceListItems.get(priceListId);
    if (!itemsMap) {
      itemsMap = new Map();
      this.priceListItems.set(priceListId, itemsMap);
    }

    dto.items.forEach((item) => {
      itemsMap!.set(item.productId, item.price);
    });

    return {
      priceListId,
      updatedCount: dto.items.length,
      totalItems: itemsMap.size,
    };
  }

  async findOne(id: string) {
    const priceList = this.priceLists.get(id);
    if (!priceList) {
      throw new NotFoundException({
        code: 'PRICE_LIST_NOT_FOUND',
        message: `Price list with id ${id} was not found`,
        statusCode: 404,
      });
    }

    const itemsMap = this.priceListItems.get(id) || new Map();
    const items = Array.from(itemsMap.entries()).map(([productId, price]) => ({
      productId,
      price,
    }));

    return {
      ...priceList,
      items,
    };
  }
}
