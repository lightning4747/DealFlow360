import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IPaymentGatewayProvider } from './payment-gateway.interface';
import {
  ProcessPaymentRequestDto,
  ProcessPaymentResponseDto,
  WebhookEventPayloadDto,
} from '@dealflow360/types';

@Injectable()
export class MockPaymentGatewayService implements IPaymentGatewayProvider {
  private readonly logger = new Logger(MockPaymentGatewayService.name);
  private readonly webhookSecret: string;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.webhookSecret = this.configService?.get<string>('PAYMENT_WEBHOOK_SECRET') || process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_mock_secret_key_360';
  }

  async processPayment(request: ProcessPaymentRequestDto): Promise<ProcessPaymentResponseDto> {
    const { token, amount, currency, invoiceId, tenantId } = request;
    const now = new Date().toISOString();
    const transactionId = `txn_mock_${crypto.randomBytes(8).toString('hex')}`;

    this.logger.log(`Processing payment token [${token}] for amount ${amount} ${currency}`);

    // Deterministic simulation based on token string:
    // tok_success -> 200 immediate capture
    if (token === 'tok_success' || token.startsWith('tok_success_')) {
      return {
        transactionId,
        status: 'SUCCEEDED',
        amount,
        currency,
        requires3ds: false,
        processedAt: now,
      };
    }

    // tok_declined -> 402 card declined
    if (token === 'tok_declined' || token.startsWith('tok_declined_')) {
      return {
        transactionId,
        status: 'FAILED',
        amount,
        currency,
        requires3ds: false,
        declineReason: 'card_declined: Insufficient funds or invalid card details.',
        processedAt: now,
      };
    }

    // tok_3ds -> 202 requires authentication, schedule webhook
    if (token === 'tok_3ds' || token.startsWith('tok_3ds_')) {
      const redirectUrl = `https://mock-gateway.dealflow360.internal/3ds-challenge?txn=${transactionId}&invoice=${invoiceId}`;

      // Schedule delayed 3DS resolution webhook in background (5 seconds)
      this.schedule3DSResolutionWebhook(transactionId, invoiceId, tenantId, amount, currency);

      return {
        transactionId,
        status: 'REQUIRES_ACTION',
        amount,
        currency,
        requires3ds: true,
        redirectUrl,
        processedAt: now,
      };
    }

    // Default fallback: any unknown token errors or fails
    return {
      transactionId,
      status: 'FAILED',
      amount,
      currency,
      requires3ds: false,
      declineReason: `unsupported_token: Token [${token}] is not recognized in mock environment.`,
      processedAt: now,
    };
  }

  /**
   * Generates HMAC-SHA256 signature for webhook payload
   */
  generateSignature(payload: string, secret: string = this.webhookSecret): string {
    return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string = this.webhookSecret): boolean {
    if (!signature || !payload) return false;
    const stringPayload = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(stringPayload, 'utf8').digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string = this.webhookSecret): WebhookEventPayloadDto {
    const valid = this.verifyWebhookSignature(payload, signature, secret);
    if (!valid) {
      throw new BadRequestException('Invalid webhook signature');
    }
    const rawString = typeof payload === 'string' ? payload : payload.toString('utf8');
    return JSON.parse(rawString) as WebhookEventPayloadDto;
  }

  private schedule3DSResolutionWebhook(
    transactionId: string,
    invoiceId: string,
    tenantId: string,
    amount: number,
    currency: string,
  ) {
    setTimeout(async () => {
      try {
        const payloadObj: WebhookEventPayloadDto = {
          eventId: `evt_${crypto.randomUUID()}`,
          eventType: 'payment_intent.succeeded',
          transactionId,
          invoiceId,
          tenantId,
          amount,
          currency,
          timestamp: new Date().toISOString(),
        };
        const rawJson = JSON.stringify(payloadObj);
        const signature = this.generateSignature(rawJson);

        this.logger.log(`[Mock Gateway] 3DS completed asynchronously for txn ${transactionId}. Signed webhook emitted.`);
      } catch (err: any) {
        this.logger.error(`Error emitting delayed 3DS webhook: ${err.message}`);
      }
    }, 5000);
  }
}
