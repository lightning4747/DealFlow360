import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PAYMENT_GATEWAY_PROVIDER } from './payment-gateway.interface';
import { MockPaymentGatewayService } from './mock-payment-gateway.service';
import { UnconfiguredPaymentGatewayService } from './unconfigured-payment-gateway.service';
import { ConfigService } from '@nestjs/config';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [PaymentsController],
  providers: [
    {
      provide: PAYMENT_GATEWAY_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('PAYMENT_GATEWAY_MODE') === 'mock'
          ? new MockPaymentGatewayService(config)
          : new UnconfiguredPaymentGatewayService(),
    },
    WebhookSignatureGuard,
  ],
  exports: [PAYMENT_GATEWAY_PROVIDER, WebhookSignatureGuard],
})
export class PaymentsModule {}
