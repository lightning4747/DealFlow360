import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { QueryRecommendationsSchema } from '@dealflow360/types';

@Controller('api/v1/sales/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(@Inject(RecommendationsService) private readonly recService: RecommendationsService) {}

  @Post()
  @Roles('sales_rep')
  async getRecommendations(@Body() body: any) {
    const dto = QueryRecommendationsSchema.parse(body);
    const data = await this.recService.getRecommendations(dto);
    return { data, meta: { total: data.length }, error: null };
  }
}
