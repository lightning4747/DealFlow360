import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import {
  ApprovalRoutingJobPayload,
  EmailNotificationJobPayload,
  FulfillmentSplitJobPayload,
  InvoiceGenerationJobPayload,
  BillingScheduleJobPayload,
  ProrationCalculationJobPayload,
} from './queue.types';
import { SpatialAllocationEngine } from '../fulfillment/spatial-allocation.engine';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { KafkaService } from '../events/kafka/kafka.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  public approvalRoutingQueue: Queue<ApprovalRoutingJobPayload>;
  public emailNotificationQueue: Queue<EmailNotificationJobPayload>;
  public fulfillmentSplitQueue: Queue<FulfillmentSplitJobPayload>;
  public invoiceGenerationQueue: Queue<InvoiceGenerationJobPayload>;
  public billingScheduleQueue: Queue<BillingScheduleJobPayload>;
  public prorationQueue: Queue<ProrationCalculationJobPayload>;

  private approvalWorker: Worker<ApprovalRoutingJobPayload>;
  private emailWorker: Worker<EmailNotificationJobPayload>;
  private fulfillmentWorker: Worker<FulfillmentSplitJobPayload>;
  private invoiceGenerationWorker: Worker<InvoiceGenerationJobPayload>;
  private billingScheduleWorker: Worker<BillingScheduleJobPayload>;
  private prorationWorker: Worker<ProrationCalculationJobPayload>;

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
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.emailNotificationQueue = new Queue<EmailNotificationJobPayload>('email-notifications', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.fulfillmentSplitQueue = new Queue<FulfillmentSplitJobPayload>('fulfillment-split', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.invoiceGenerationQueue = new Queue<InvoiceGenerationJobPayload>('invoice-generation', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.billingScheduleQueue = new Queue<BillingScheduleJobPayload>('billing-schedule-generation', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    });

    this.prorationQueue = new Queue<ProrationCalculationJobPayload>('proration-calculation', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
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
      { connection, concurrency: 5 },
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

        await this.kafkaService.publishEvent(
          'fulfillment.events',
          'FULFILLMENT_SPLIT_CALCULATED',
          job.data.quoteId,
          {
            ...splitResult,
            timestamp: new Date().toISOString(),
          },
        );

        return { processed: true, quoteId: job.data.quoteId, hubCount: splitResult.hubCount };
      },
      { connection, concurrency: 5 },
    );

    this.invoiceGenerationWorker = new Worker<InvoiceGenerationJobPayload>(
      'invoice-generation',
      async (job: Job<InvoiceGenerationJobPayload>) => {
        this.logger.log(`Processing invoice-generation PDF job for invoice ${job.data.invoiceId}`);
        return { generated: true, invoiceId: job.data.invoiceId };
      },
      { connection, concurrency: 5 },
    );

    this.billingScheduleWorker = new Worker<BillingScheduleJobPayload>(
      'billing-schedule-generation',
      async (job: Job<BillingScheduleJobPayload>) => {
        this.logger.log(`Processing billing schedule sweep for subscription ${job.data.subscriptionId}`);
        return { processed: true, subscriptionId: job.data.subscriptionId };
      },
      { connection, concurrency: 5 },
    );

    this.prorationWorker = new Worker<ProrationCalculationJobPayload>(
      'proration-calculation',
      async (job: Job<ProrationCalculationJobPayload>) => {
        this.logger.log(`Processing async proration for subscription ${job.data.subscriptionId}`);
        return { processed: true, subscriptionId: job.data.subscriptionId };
      },
      { connection, concurrency: 5 },
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
    await this.invoiceGenerationWorker.close();
    await this.billingScheduleWorker.close();
    await this.prorationWorker.close();
    await this.approvalRoutingQueue.close();
    await this.emailNotificationQueue.close();
    await this.fulfillmentSplitQueue.close();
    await this.invoiceGenerationQueue.close();
    await this.billingScheduleQueue.close();
    await this.prorationQueue.close();
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

  async enqueueInvoiceGeneration(payload: InvoiceGenerationJobPayload): Promise<void> {
    await this.invoiceGenerationQueue.add('generate-invoice', payload, {
      jobId: `invoice-gen-${payload.invoiceId}-${Date.now()}`,
    });
  }

  async enqueueBillingScheduleGeneration(payload: BillingScheduleJobPayload): Promise<void> {
    await this.billingScheduleQueue.add('generate-schedule', payload, {
      jobId: `billing-sched-${payload.subscriptionId}-${Date.now()}`,
    });
  }

  async enqueueProration(payload: ProrationCalculationJobPayload): Promise<void> {
    await this.prorationQueue.add('compute-proration', payload, {
      jobId: `proration-${payload.subscriptionId}-${Date.now()}`,
    });
  }
}
