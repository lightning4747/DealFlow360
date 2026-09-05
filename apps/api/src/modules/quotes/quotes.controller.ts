import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import {
  CalculateQuoteSchema,
  CreateQuoteSchema,
  UpdateQuoteLineSchema,
  CreateLineCommentSchema,
} from '@dealflow360/types';

@Controller('api/v1/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotesService: QuotesService) {}

  @Get('quotes')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async listQuotes() {
    const data = await this.quotesService.findAllQuotes();
    return { data, meta: null, error: null };
  }

  @Get('customers')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async listCustomers() {
    const data = await this.quotesService.findAllCustomers();
    return { data, meta: null, error: null };
  }

  @Post('quotes/calculate')
  @Roles('sales_rep')
  async calculateQuote(@Body() body: any) {
    const dto = CalculateQuoteSchema.parse(body);
    const data = await this.quotesService.calculateQuote(dto);
    return { data, meta: null, error: null };
  }

  @Post('quotes')
  @Roles('sales_rep')
  async createQuote(@Body() body: any, @Req() req: any) {
    const dto = CreateQuoteSchema.parse(body);
    const data = await this.quotesService.createQuote(dto, req.user);
    return { data, meta: null, error: null };
  }

  @Get('quotes/:id')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async getQuote(@Param('id') id: string) {
    const data = await this.quotesService.getQuoteById(id);
    return { data, meta: null, error: null };
  }

  @Patch('quotes/lines/:lineId')
  @Roles('sales_rep')
  async updateLine(@Param('lineId') lineId: string, @Body() body: any, @Req() req: any) {
    const dto = UpdateQuoteLineSchema.parse(body);
    const data = await this.quotesService.updateQuoteLine(lineId, dto, req.user);
    return { data, meta: null, error: null };
  }

  @Post('quotes/lines/:lineId/comments')
  @Roles('admin', 'sales_rep', 'sales_manager', 'finance')
  async addLineComment(@Param('lineId') lineId: string, @Body() body: any, @Req() req: any) {
    const dto = CreateLineCommentSchema.parse(body);
    const data = await this.quotesService.addLineComment(lineId, dto, req.user);
    return { data, meta: null, error: null };
  }
}
