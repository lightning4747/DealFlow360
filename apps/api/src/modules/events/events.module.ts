import { Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka/kafka.service';
import { QueueService } from '../queue/queue.service';
import { NegotiationGateway } from './negotiation.gateway';

@Global()
@Module({
  providers: [KafkaService, QueueService, NegotiationGateway],
  exports: [KafkaService, QueueService, NegotiationGateway],
})
export class EventsModule {}
