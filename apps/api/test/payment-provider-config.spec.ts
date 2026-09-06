import { UnconfiguredPaymentGatewayService } from '../src/modules/payments/unconfigured-payment-gateway.service';

describe('Payment provider configuration', () => {
  it('fails closed instead of simulating a successful payment', async () => {
    const provider = new UnconfiguredPaymentGatewayService();

    await expect(
      provider.processPayment({
        token: 'tok_success',
        amount: 100,
        currency: 'USD',
        invoiceId: 'invoice-1',
        tenantId: 'tenant-1',
      }),
    ).rejects.toThrow('Payment gateway is not configured');
  });
});
