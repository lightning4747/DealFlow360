import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { PAYMENT_GATEWAY_PROVIDER, IPaymentGatewayProvider } from './payment-gateway.interface';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    @Inject(PAYMENT_GATEWAY_PROVIDER)
    private readonly paymentGateway: IPaymentGatewayProvider,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-razorpay-signature'] || request.headers['x-signature'] || request.headers['stripe-signature'];

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature header');
    }

    const payload = request.rawBody || (typeof request.body === 'string' ? request.body : JSON.stringify(request.body));
    const isValid = this.paymentGateway.verifyWebhookSignature(payload, signature as string, process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_mock_secret_key_360');

    if (!isValid) {
      throw new UnauthorizedException('Invalid cryptographic webhook signature');
    }

    return true;
  }
}
