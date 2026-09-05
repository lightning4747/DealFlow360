import { Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka/kafka.service';
import { QueueService } from '../queue/queue.service';

@Global()
@Module({
  providers: [KafkaService, QueueService],
  exports: [KafkaService, QueueService],
})
export class EventsModule {}
