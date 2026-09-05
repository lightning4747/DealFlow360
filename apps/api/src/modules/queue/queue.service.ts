import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { ApprovalRoutingJobPayload, EmailNotificationJobPayload } from './queue.types';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  public approvalRoutingQueue: Queue<ApprovalRoutingJobPayload>;
  public emailNotificationQueue: Queue<EmailNotificationJobPayload>;
  private approvalWorker: Worker<ApprovalRoutingJobPayload>;
  private emailWorker: Worker<EmailNotificationJobPayload>;

  constructor(private readonly configService: ConfigService) {
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

    // Initialize Workers
    this.approvalWorker = new Worker<ApprovalRoutingJobPayload>(
      'approval-routing',
      async (job: Job<ApprovalRoutingJobPayload>) => {
        this.logger.log(`Processing approval-routing job ${job.id} for quote ${job.data.quoteId}`);
        // Dispatch SLA timers or escalations
        if (job.data.brs > 50) {
          // Trigger high risk alert email
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

    this.approvalWorker.on('failed', (job, err) => {
      this.logger.error(`Job in approval-routing queue failed: ${err.message}`);
    });

    this.emailWorker.on('failed', (job, err) => {
      this.logger.error(`Job in email-notifications queue failed: ${err.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('BullMQ queues & workers initialized.');
  }

  async onModuleDestroy() {
    await this.approvalWorker.close();
    await this.emailWorker.close();
    await this.approvalRoutingQueue.close();
    await this.emailNotificationQueue.close();
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
}
