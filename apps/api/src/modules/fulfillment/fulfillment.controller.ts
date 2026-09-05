import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { StockReservationService } from './stock-reservation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import {
  ReserveStockRequestSchema,
  ReleaseStockRequestSchema,
} from '@dealflow360/types';

@Controller('api/v1/fulfillment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FulfillmentController {
  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly stockReservationService: StockReservationService,
  ) {}

  @Get('warehouses')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async getWarehouses() {
    const data = await this.fulfillmentService.getWarehouses();
    return { data, meta: null, error: null };
  }

  @Get('stock')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async getStockOverview(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const data = await this.stockReservationService.getStockOverview(productId, warehouseId);
    return { data, meta: null, error: null };
  }

  @Get('splits/:quoteId')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async getSplitsByQuoteId(@Param('quoteId') quoteId: string) {
    const data = await this.fulfillmentService.getSplitsByQuoteId(quoteId);
    return { data, meta: null, error: null };
  }

  @Post('reserve')
  @Roles('admin', 'sales_rep', 'sales_manager')
  async reserveStock(@Body() body: any) {
    const dto = ReserveStockRequestSchema.parse(body);
    const data = await this.stockReservationService.reserveStock(dto.quoteId, dto.reservations);
    return { data, meta: null, error: null };
  }

  @Post('release')
  @Roles('admin', 'sales_rep', 'sales_manager')
  async releaseStock(@Body() body: any) {
    const dto = ReleaseStockRequestSchema.parse(body);
    const data = await this.stockReservationService.releaseStock(dto.quoteId, dto.releases);
    return { data, meta: null, error: null };
  }
}
