import { ProcessPaymentRequestDto, ProcessPaymentResponseDto, WebhookEventPayloadDto } from '@dealflow360/types';

export const PAYMENT_GATEWAY_PROVIDER = 'PAYMENT_GATEWAY_PROVIDER';

export interface IPaymentGatewayProvider {
  createOrder?(params: { invoiceId: string; amount: number; currency: string }): Promise<{
    orderId: string;
    amount: number;
    currency: string;
  }>;

  /**
   * Authorize and capture payment or trigger 3DS flow
   */
  processPayment(request: ProcessPaymentRequestDto): Promise<ProcessPaymentResponseDto>;

  /**
   * Verify cryptographic signature of an incoming webhook payload
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;

  /**
   * Construct webhook event payload from raw bytes
   */
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): WebhookEventPayloadDto;

  parseWebhook?(payload: string | Buffer, signature: string): Promise<WebhookEventPayloadDto>;
}
