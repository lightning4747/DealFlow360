import { Module } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { StockReservationService } from './stock-reservation.service';
import { FulfillmentController } from './fulfillment.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FulfillmentController],
  providers: [FulfillmentService, StockReservationService],
  exports: [FulfillmentService, StockReservationService],
})
export class FulfillmentModule {}
