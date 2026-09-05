import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { CreatePriceListSchema, BulkPriceListItemsSchema } from '@dealflow360/types';

@Controller('api/v1/sales/price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @Roles('admin', 'finance')
  async create(@Body() body: any) {
    const dto = CreatePriceListSchema.parse(body);
    const data = await this.priceListsService.create(dto);
    return { data, meta: null, error: null };
  }

  @Get()
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async findAll() {
    const data = await this.priceListsService.findAll();
    return { data, meta: null, error: null };
  }

  @Post(':id/items')
  @Roles('admin', 'finance')
  async addItems(@Param('id') id: string, @Body() body: any) {
    const dto = BulkPriceListItemsSchema.parse(body);
    const data = await this.priceListsService.addItems(id, dto);
    return { data, meta: null, error: null };
  }

  @Get(':id')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async findOne(@Param('id') id: string) {
    const data = await this.priceListsService.findOne(id);
    return { data, meta: null, error: null };
  }
}
