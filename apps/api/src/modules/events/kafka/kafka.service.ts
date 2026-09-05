import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { KafkaEventEnvelope } from './kafka-events.types';
import * as crypto from 'crypto';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = (this.configService.get<string>('KAFKA_BOOTSTRAP_SERVERS') || 'localhost:9092').split(',');
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'dealflow360-api';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'dealflow360-approval-svc-cg',
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka Producer connected successfully.');

      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: ['quote.events', 'approval.events', 'fulfillment.events'],
        fromBeginning: false,
      });
      this.logger.log('Kafka Consumer subscribed to quote.events, approval.events, and fulfillment.events.');

      // Run consumer loop asynchronously in background so NestJS HTTP starts immediately
      this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventType = message.headers?.eventType?.toString() || 'unknown';
            const payload = message.value ? JSON.parse(message.value.toString()) : null;
            this.logger.log(`Received event [${eventType}] on ${topic}[${partition}]`);
          } catch (err: any) {
            this.logger.error(`Error processing Kafka message on ${topic}: ${err.message}`);
          }
        },
      }).catch((err) => {
        this.logger.warn(`Kafka consumer run notice: ${err.message}`);
      });

      this.isConnected = true;
    } catch (err: any) {
      this.logger.warn(`Kafka broker connection failed (falling back to graceful mode): ${err.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isConnected) {
        await this.consumer.disconnect();
        await this.producer.disconnect();
      }
    } catch (err: any) {
      this.logger.error(`Error disconnecting Kafka: ${err.message}`);
    }
  }

  async publishEvent<T>(topic: string, eventType: string, partitionKey: string, data: T): Promise<void> {
    const envelope: KafkaEventEnvelope<T> = {
      eventId: crypto.randomUUID(),
      producedAt: new Date().toISOString(),
      topic,
      eventType,
      schemaVersion: '1.0',
      source: 'dealflow360-api',
      data,
    };

    if (!this.isConnected) {
      this.logger.warn(`Kafka offline: simulated emit of [${eventType}] on topic ${topic}`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: partitionKey,
            value: JSON.stringify(envelope),
            headers: {
              eventType,
              schemaVersion: '1.0',
            },
          },
        ],
      });
      this.logger.log(`Published event [${eventType}] to topic ${topic} (key: ${partitionKey})`);
    } catch (err: any) {
      this.logger.error(`Failed to publish event [${eventType}] to ${topic}: ${err.message}`);
    }
  }
}
