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
    const parsed = ProcessPaymentRequestSchema.safeParse({ ...rawBody, tenantId });
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @Public()
  async handleWebhook(@Body() rawBody: any) {
    const parsed = WebhookEventPayloadSchema.safeParse(rawBody);
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
