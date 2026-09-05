import { Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka/kafka.service';
import { QueueService } from '../queue/queue.service';
import { NegotiationGateway } from './negotiation.gateway';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Global()
@Module({
  imports: [FulfillmentModule],
  providers: [KafkaService, QueueService, NegotiationGateway],
  exports: [KafkaService, QueueService, NegotiationGateway],
})
export class EventsModule {}
