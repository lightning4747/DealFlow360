import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IPaymentGatewayProvider } from './payment-gateway.interface';
import {
  ProcessPaymentRequestDto,
  ProcessPaymentResponseDto,
  WebhookEventPayloadDto,
} from '@dealflow360/types';

@Injectable()
export class UnconfiguredPaymentGatewayService implements IPaymentGatewayProvider {
  async processPayment(_request: ProcessPaymentRequestDto): Promise<ProcessPaymentResponseDto> {
    throw new ServiceUnavailableException('Payment gateway is not configured');
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string, _secret: string): boolean {
    return false;
  }

  constructWebhookEvent(_payload: string | Buffer, _signature: string, _secret: string): WebhookEventPayloadDto {
    throw new ServiceUnavailableException('Payment gateway is not configured');
  }
}
