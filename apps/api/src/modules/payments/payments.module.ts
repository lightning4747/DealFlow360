import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PAYMENT_GATEWAY_PROVIDER } from './payment-gateway.interface';
import { MockPaymentGatewayService } from './mock-payment-gateway.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [PaymentsController],
  providers: [
    {
      provide: PAYMENT_GATEWAY_PROVIDER,
      useClass: MockPaymentGatewayService,
    },
    WebhookSignatureGuard,
  ],
  exports: [PAYMENT_GATEWAY_PROVIDER, WebhookSignatureGuard],
})
export class PaymentsModule {}
