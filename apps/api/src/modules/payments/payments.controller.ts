import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
  Inject,
  Logger,
} from '@nestjs/common';
import { PAYMENT_GATEWAY_PROVIDER, IPaymentGatewayProvider } from './payment-gateway.interface';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import {
  ProcessPaymentRequestSchema,
  ProcessPaymentRequestDto,
  WebhookEventPayloadSchema,
  WebhookEventPayloadDto,
} from '@dealflow360/types';
import { BillingService } from '../billing/billing.service';
import { Public } from '../auth/decorators/auth.decorator';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    @Inject(PAYMENT_GATEWAY_PROVIDER)
    private readonly paymentGateway: IPaymentGatewayProvider,
    private readonly billingService: BillingService,
  ) {}

  @Post('process')
  async processPayment(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Body() rawBody: any,
    @Req() request: { user?: { tenantId?: string } },
  ) {
    const tenantId = request.user?.tenantId || tenantIdHeader;
    if (!tenantId) {
      throw new BadRequestException('Authenticated tenant context is required');
    }

    if (typeof rawBody?.invoiceId !== 'string') {
      throw new BadRequestException('Invoice ID is required');
    }
    const invoice = await this.billingService.getInvoiceById(rawBody.invoiceId, request.user as any);
    const parsed = ProcessPaymentRequestSchema.safeParse({
      ...rawBody,
      tenantId,
      amount: Number(invoice.totalAmount),
      currency: invoice.currency,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }

    const result = await this.paymentGateway.processPayment(parsed.data);

    // If payment succeeded immediately, record payment in billing engine
    if (result.status === 'SUCCEEDED') {
      await this.billingService.recordPayment({
        invoiceId: parsed.data.invoiceId,
        tenantId,
        amount: parsed.data.amount,
        paymentMethod: 'CREDIT_CARD',
        referenceTransactionId: result.transactionId,
      });
    }

    if (result.status === 'FAILED') {
      return {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        ...result,
      };
    }

    if (result.status === 'REQUIRES_ACTION') {
      return {
        statusCode: HttpStatus.ACCEPTED,
        ...result,
      };
    }

    return {
      statusCode: HttpStatus.OK,
      ...result,
    };
  }

  @Post('orders')
  async createOrder(@Body() body: { invoiceId: string }, @Req() request: any) {
    if (!this.paymentGateway.createOrder) {
      throw new BadRequestException('Payment gateway does not support order creation');
    }
    const invoice = await this.billingService.getInvoiceById(body.invoiceId, request.user);
    const amount = Number(invoice.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invoice has no payable amount');
    }
    return this.paymentGateway.createOrder({
      invoiceId: invoice.id,
      amount,
      currency: invoice.currency,
    });
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @Public()
  async handleWebhook(@Body() rawBody: any, @Req() request: any) {
    const signature = request.headers['x-razorpay-signature'] || request.headers['x-signature'];
    const payload = request.rawBody || JSON.stringify(rawBody);
    const gatewayEvent = this.paymentGateway.parseWebhook
      ? await this.paymentGateway.parseWebhook(payload, signature)
      : rawBody;
    const parsed = WebhookEventPayloadSchema.safeParse(gatewayEvent);
    if (!parsed.success) {
      throw new BadRequestException('Malformed webhook payload');
    }

    const event = parsed.data;
    this.logger.log(`Received verified webhook event [${event.eventType}] for txn ${event.transactionId}`);

    if (event.eventType === 'payment_intent.succeeded') {
      await this.billingService.recordPayment({
        invoiceId: event.invoiceId,
        tenantId: event.tenantId,
        amount: event.amount,
        paymentMethod: 'CREDIT_CARD',
        referenceTransactionId: event.transactionId,
      });
      this.logger.log(`Invoice ${event.invoiceId} successfully settled via 3DS webhook`);
    }

    return { received: true, eventId: event.eventId };
  }
}
