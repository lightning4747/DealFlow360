import { Controller, Get, Post, Body, Query, Req, Inject, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service';
import { Public } from '../auth/decorators/auth.decorator';
import { CustomerCounterProposalSchema } from '@dealflow360/types';
import { PortalAuthGuard } from '../auth/guards/portal-auth.guard';

@Controller('api/v1/portal/quotes')
export class PortalController {
  constructor(@Inject(PortalService) private readonly portalService: PortalService) {}

  @Public()
  @UseGuards(PortalAuthGuard)
  @Get('view')
  async getQuote(@Req() req: any) {
    const data = await this.portalService.getSanitizedQuoteBySession(req.user);
    return { data, meta: null, error: null };
  }

  @Public()
  @UseGuards(PortalAuthGuard)
  @Post('counter')
  async submitCounter(@Req() req: any, @Body() body: any) {
    const dto = CustomerCounterProposalSchema.parse(body);
    const data = await this.portalService.submitCounterProposalBySession(req.user, dto);
    return { data, meta: null, error: null };
  }

  @Public()
  @UseGuards(PortalAuthGuard)
  @Post('confirm')
  async confirmQuote(@Req() req: any, @Body() body: any) {
    const participantName = body?.participantName;
    const data = await this.portalService.confirmQuoteBySession(req.user, participantName);
    return { data, meta: null, error: null };
  }

}
