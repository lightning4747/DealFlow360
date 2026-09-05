import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { ApprovalRoutingJobPayload, EmailNotificationJobPayload, FulfillmentSplitJobPayload } from './queue.types';
import { SpatialAllocationEngine } from '../fulfillment/spatial-allocation.engine';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { KafkaService } from '../events/kafka/kafka.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  public approvalRoutingQueue: Queue<ApprovalRoutingJobPayload>;
  public emailNotificationQueue: Queue<EmailNotificationJobPayload>;
  public fulfillmentSplitQueue: Queue<FulfillmentSplitJobPayload>;
  private approvalWorker: Worker<ApprovalRoutingJobPayload>;
  private emailWorker: Worker<EmailNotificationJobPayload>;
  private fulfillmentWorker: Worker<FulfillmentSplitJobPayload>;

  constructor(
    private readonly configService: ConfigService,
    private readonly spatialEngine: SpatialAllocationEngine,
    private readonly fulfillmentService: FulfillmentService,
    private readonly kafkaService: KafkaService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);
    const connection = { host, port };

    this.approvalRoutingQueue = new Queue<ApprovalRoutingJobPayload>('approval-routing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.emailNotificationQueue = new Queue<EmailNotificationJobPayload>('email-notifications', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.fulfillmentSplitQueue = new Queue<FulfillmentSplitJobPayload>('fulfillment-split', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    // Initialize Workers
    this.approvalWorker = new Worker<ApprovalRoutingJobPayload>(
      'approval-routing',
      async (job: Job<ApprovalRoutingJobPayload>) => {
        this.logger.log(`Processing approval-routing job ${job.id} for quote ${job.data.quoteId}`);
        if (job.data.brs > 50) {
          await this.enqueueEmail({
            to: 'admin@dealflow360.com',
            recipientName: 'Administrator',
            templateId: 'high-risk-alert',
            variables: {
              quoteId: job.data.quoteId,
              brs: job.data.brs,
            },
            idempotencyKey: `high-risk-${job.data.quoteId}`,
          });
        }
        return { processed: true, quoteId: job.data.quoteId };
      },
      {
        connection,
        concurrency: 5,
      },
    );

    this.emailWorker = new Worker<EmailNotificationJobPayload>(
      'email-notifications',
      async (job: Job<EmailNotificationJobPayload>) => {
        this.logger.log(`Sending email [${job.data.templateId}] to ${job.data.to} (key: ${job.data.idempotencyKey})`);
        return { delivered: true, recipient: job.data.to, template: job.data.templateId };
      },
      {
        connection,
        concurrency: 10,
        limiter: { max: 100, duration: 1000 },
      },
    );

    this.fulfillmentWorker = new Worker<FulfillmentSplitJobPayload>(
      'fulfillment-split',
      async (job: Job<FulfillmentSplitJobPayload>) => {
        this.logger.log(`Processing fulfillment-split job ${job.id} for quote ${job.data.quoteId}`);
        const splitResult = await this.spatialEngine.calculateFulfillmentSplit(job.data);
        await this.fulfillmentService.saveSplitPlan(splitResult);

        // Publish event to Kafka
        await this.kafkaService.publishEvent(
          'fulfillment.events',
          'FULFILLMENT_SPLIT_CALCULATED',
          job.data.quoteId,
          {
            ...splitResult,
            timestamp: new Date().toISOString(),
          }
        );

        return { processed: true, quoteId: job.data.quoteId, hubCount: splitResult.hubCount };
      },
      {
        connection,
        concurrency: 5,
      },
    );

    this.approvalWorker.on('failed', (job, err) => {
      this.logger.error(`Job in approval-routing queue failed: ${err.message}`);
    });

    this.emailWorker.on('failed', (job, err) => {
      this.logger.error(`Job in email-notifications queue failed: ${err.message}`);
    });

    this.fulfillmentWorker.on('failed', (job, err) => {
      this.logger.error(`Job in fulfillment-split queue failed: ${err.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('BullMQ queues & workers initialized.');
  }

  async onModuleDestroy() {
    await this.approvalWorker.close();
    await this.emailWorker.close();
    await this.fulfillmentWorker.close();
    await this.approvalRoutingQueue.close();
    await this.emailNotificationQueue.close();
    await this.fulfillmentSplitQueue.close();
  }

  async enqueueApprovalRouting(payload: ApprovalRoutingJobPayload): Promise<void> {
    await this.approvalRoutingQueue.add('route-approval', payload, {
      jobId: `approval-${payload.quoteId}-${Date.now()}`,
    });
  }

  async enqueueEmail(payload: EmailNotificationJobPayload): Promise<void> {
    await this.emailNotificationQueue.add('send-email', payload, {
      jobId: payload.idempotencyKey,
    });
  }

  async enqueueFulfillmentSplit(payload: FulfillmentSplitJobPayload): Promise<void> {
    await this.fulfillmentSplitQueue.add('calculate-split', payload, {
      jobId: `fulfillment-split-${payload.quoteId}-${Date.now()}`,
    });
  }
}
