import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { CustomerTiersService } from './customer-tiers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { CreateCustomerTierSchema } from '@dealflow360/types';

@Controller('api/v1/sales/customer-tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerTiersController {
  constructor(@Inject(CustomerTiersService) private readonly tiersService: CustomerTiersService) {}

  @Post()
  @Roles('admin')
  async create(@Body() body: any) {
    const dto = CreateCustomerTierSchema.parse(body);
    const data = await this.tiersService.create(dto);
    return { data, meta: null, error: null };
  }

  @Get()
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async findAll() {
    const data = await this.tiersService.findAll();
    return { data, meta: null, error: null };
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: any) {
    const dto = CreateCustomerTierSchema.partial().parse(body);
    const data = await this.tiersService.update(id, dto);
    return { data, meta: null, error: null };
  }
}
