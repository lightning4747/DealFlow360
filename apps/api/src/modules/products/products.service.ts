import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from '@dealflow360/types';

@Injectable()
export class ProductsService {
  private products: Map<string, any> = new Map();

  async create(dto: CreateProductDto) {
    const id = `prod_${Date.now()}`;
    const product = {
      id,
      ...dto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, product);
    return product;
  }

  async findAll(query: { category?: string; search?: string; page?: number; limit?: number }) {
    let list = Array.from(this.products.values());
    if (query.category) {
      list = list.filter((p) => p.category === query.category);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower),
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = this.products.get(id);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} was not found`,
        statusCode: 404,
      });
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    const updated = {
      ...product,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    product.isActive = false;
    product.updatedAt = new Date().toISOString();
    this.products.set(id, product);
    return { success: true, message: `Product ${id} deactivated` };
  }
}
