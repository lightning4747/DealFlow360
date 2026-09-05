import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuoteCalculationService } from './quote-calculation.service';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [GovernanceModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuoteCalculationService],
  exports: [QuotesService, QuoteCalculationService],
})
export class QuotesModule {}
