import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { OrderBifurcationService } from './order-bifurcation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import {
  ModifySubscriptionQuantitySchema,
  CancelSubscriptionSchema,
  VoidInvoiceSchema,
  SendInvoiceSchema,
  ProrationPreviewQuerySchema,
} from '@dealflow360/types';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
    @Inject(OrderBifurcationService)
    private readonly bifurcationService: OrderBifurcationService,
  ) {}

  // ─── QUOTE CONFIRMATION (BIFURCATION SPLIT) ────────────────────────────────
  @Post('sales/quotes/:id/confirm')
  @Roles('sales_rep', 'finance')
  async confirmQuote(@Param('id') id: string, @Req() req: any) {
    const actor = {
      id: req.user?.id || 'unknown',
      role: req.user?.role || 'sales_rep',
      name: req.user?.name || 'Sales User',
    };
    const data = await this.bifurcationService.confirmQuote(id, actor);
    return { data, meta: null, error: null };
  }

  // ─── INVOICES ─────────────────────────────────────────────────────────────
  @Get('internal/invoices')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async listInvoices(
    @Query('customer_id') customerId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.billingService.listInvoices({
      customerId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return result;
  }

  @Get('internal/invoices/:id')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async getInvoice(@Param('id') id: string) {
    const data = await this.billingService.getInvoiceById(id);
    return { data, meta: null, error: null };
  }

  @Post('internal/invoices/:id/send')
  @Roles('admin', 'finance')
  async sendInvoice(@Param('id') id: string, @Body() body: any) {
    const dto = SendInvoiceSchema.parse(body);
    const data = await this.billingService.sendInvoice(id, dto);
    return { data, meta: null, error: null };
  }

  @Post('internal/invoices/:id/void')
  @Roles('admin', 'finance')
  async voidInvoice(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const dto = VoidInvoiceSchema.parse(body);
    const data = await this.billingService.voidInvoice(id, dto, req.user);
    return { data, meta: null, error: null };
  }

  @Get('internal/invoices/:id/credit-notes')
  @Roles('admin', 'finance')
  async listCreditNotes(@Param('id') id: string) {
    const data = await this.billingService.listInvoiceCreditNotes(id);
    return { data, meta: null, error: null };
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
  @Get('internal/subscriptions')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async listSubscriptions(
    @Query('customer_id') customerId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.billingService.listSubscriptions({
      customerId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return result;
  }

  @Get('internal/subscriptions/:id')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async getSubscription(@Param('id') id: string) {
    const data = await this.billingService.getSubscriptionById(id);
    return { data, meta: null, error: null };
  }

  @Get('internal/subscriptions/:id/billing-schedule')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async getSubscriptionBillingSchedule(@Param('id') id: string) {
    const data = await this.billingService.getSubscriptionBillingSchedules(id);
    return { data, meta: null, error: null };
  }

  @Get('internal/subscriptions/:id/proration-preview')
  @Roles('admin', 'finance', 'sales_manager', 'sales_rep')
  async previewProration(@Param('id') id: string, @Query() query: any) {
    const dto = ProrationPreviewQuerySchema.parse(query);
    const data = await this.billingService.previewProration(id, dto);
    return { data, meta: null, error: null };
  }

  @Patch('internal/subscriptions/:id/quantity')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async modifyQuantity(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const dto = ModifySubscriptionQuantitySchema.parse(body);
    const data = await this.billingService.modifySubscriptionQuantity(id, dto, req.user);
    return { data, meta: null, error: null };
  }

  @Post('internal/subscriptions/:id/cancel')
  @Roles('admin', 'finance', 'sales_manager')
  async cancelSubscription(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const dto = CancelSubscriptionSchema.parse(body);
    const data = await this.billingService.cancelSubscription(id, dto, req.user);
    return { data, meta: null, error: null };
  }
}
