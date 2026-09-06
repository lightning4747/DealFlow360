import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { IPaymentGatewayProvider } from './payment-gateway.interface';
import {
  ProcessPaymentRequestDto,
  ProcessPaymentResponseDto,
  WebhookEventPayloadDto,
} from '@dealflow360/types';

@Injectable()
export class RazorpayPaymentGatewayService implements IPaymentGatewayProvider {
  private readonly client: Razorpay;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const keyId = config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = config.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    if (!keyId || !keySecret || !this.webhookSecret) {
      throw new Error('Razorpay requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET');
    }
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(params: { invoiceId: string; amount: number; currency: string }) {
    const order = await this.client.orders.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      receipt: params.invoiceId,
      notes: { invoiceId: params.invoiceId },
    });
    return { orderId: order.id, amount: Number(order.amount) / 100, currency: order.currency };
  }

  async processPayment(request: ProcessPaymentRequestDto): Promise<ProcessPaymentResponseDto> {
    let payload: { orderId: string; paymentId: string; signature: string };
    try {
      payload = JSON.parse(request.token);
    } catch {
      throw new UnprocessableEntityException('Payment token must contain Razorpay checkout credentials');
    }
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${payload.orderId}|${payload.paymentId}`)
      .digest('hex');
    const actualSignature = Buffer.from(payload.signature || '');
    const expectedSignature = Buffer.from(expected);
    if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(expectedSignature, actualSignature)) {
      throw new UnprocessableEntityException('Invalid Razorpay payment signature');
    }
    const payment = await this.client.payments.fetch(payload.paymentId);
    if (payment.order_id !== payload.orderId || Number(payment.amount) !== Math.round(request.amount * 100)) {
      throw new UnprocessableEntityException('Razorpay payment does not match the invoice');
    }
    return {
      transactionId: payment.id,
      status: payment.status === 'captured' ? 'SUCCEEDED' : 'REQUIRES_ACTION',
      amount: request.amount,
      currency: request.currency,
      requires3ds: false,
      processedAt: new Date().toISOString(),
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!signature || !this.webhookSecret) return false;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    const actual = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): WebhookEventPayloadDto {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new UnprocessableEntityException('Invalid Razorpay webhook signature');
    }
    const parsed = JSON.parse(payload.toString()) as {
      id: string;
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } };
    };
    const payment = parsed.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id || payment.amount === undefined || !payment.currency) {
      throw new UnprocessableEntityException('Razorpay webhook does not contain a payment entity');
    }
    return {
      eventId: parsed.id,
      eventType: parsed.event === 'payment.captured' ? 'payment_intent.succeeded' : 'payment_intent.payment_failed',
      transactionId: payment.id,
      invoiceId: payment.order_id,
      tenantId: '00000000-0000-0000-0000-000000000000',
      amount: payment.amount / 100,
      currency: payment.currency,
      timestamp: new Date().toISOString(),
    };
  }

  async parseWebhook(payload: string | Buffer, signature: string): Promise<WebhookEventPayloadDto> {
    const parsed = JSON.parse(payload.toString()) as {
      id: string;
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } };
    };
    const payment = parsed.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id || payment.amount === undefined || !payment.currency) {
      throw new UnprocessableEntityException('Razorpay webhook does not contain a payment entity');
    }
    const order = await this.client.orders.fetch(payment.order_id);
    const invoiceId = String(order.notes?.invoiceId || order.receipt || '');
    if (!invoiceId) throw new UnprocessableEntityException('Razorpay order is not linked to an invoice');
    const event = this.constructWebhookEvent(payload, signature);
    return { ...event, invoiceId };
  }
}
