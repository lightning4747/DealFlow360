import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka/kafka.service';
import { QueueService } from '../queue/queue.service';
import { MailService } from '../queue/mail.service';
import { NegotiationGateway } from './negotiation.gateway';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Global()
@Module({
  imports: [ConfigModule, FulfillmentModule],
  providers: [KafkaService, QueueService, MailService, NegotiationGateway],
  exports: [KafkaService, QueueService, NegotiationGateway],
})
export class EventsModule {}
