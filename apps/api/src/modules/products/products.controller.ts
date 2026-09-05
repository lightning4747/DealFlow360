import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { CreateProductSchema, UpdateProductSchema } from '@dealflow360/types';

@Controller('api/v1/sales/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    const dto = CreateProductSchema.parse(body);
    const data = await this.productsService.create(dto);
    return { data, meta: null, error: null };
  }

  @Get()
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.productsService.findAll({
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return {
      data: result.items,
      meta: result.meta,
      error: null,
    };
  }

  @Get(':id')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findOne(id);
    return { data, meta: null, error: null };
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: any) {
    const dto = UpdateProductSchema.parse(body);
    const data = await this.productsService.update(id, dto);
    return { data, meta: null, error: null };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const data = await this.productsService.remove(id);
    return { data, meta: null, error: null };
  }
}
