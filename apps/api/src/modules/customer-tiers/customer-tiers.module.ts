import { Module } from '@nestjs/common';
import { CustomerTiersController } from './customer-tiers.controller';
import { CustomerTiersService } from './customer-tiers.service';

@Module({
  controllers: [CustomerTiersController],
  providers: [CustomerTiersService],
  exports: [CustomerTiersService],
})
export class CustomerTiersModule {}
