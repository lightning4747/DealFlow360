import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PortalService } from './portal.service';
import { Public } from '../auth/decorators/auth.decorator';
import { CustomerCounterProposalSchema } from '@dealflow360/types';

@Controller('api/v1/portal/quotes')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Public()
  @Get('view')
  async getQuote(@Query('token') token: string) {
    const data = await this.portalService.getSanitizedQuoteByToken(token);
    return { data, meta: null, error: null };
  }

  @Public()
  @Post('counter')
  async submitCounter(@Query('token') token: string, @Body() body: any) {
    const dto = CustomerCounterProposalSchema.parse(body);
    const data = await this.portalService.submitCounterProposal(token, dto);
    return { data, meta: null, error: null };
  }

  @Public()
  @Post('confirm')
  async confirmQuote(@Query('token') token: string, @Body() body: any) {
    const participantName = body?.participantName;
    const data = await this.portalService.confirmQuoteByToken(token, participantName);
    return { data, meta: null, error: null };
  }
}

