import { ConfigService } from '@nestjs/config';
import { MockPaymentGatewayService } from '../src/modules/payments/mock-payment-gateway.service';

describe('Mock Payment Gateway Service (Phase 6 Integrations)', () => {
  let gateway: MockPaymentGatewayService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    gateway = new MockPaymentGatewayService(configService);
  });

  it('should immediately capture payment when token is tok_success', async () => {
    const res = await gateway.processPayment({
      token: 'tok_success',
      amount: 1500.0,
      currency: 'USD',
      invoiceId: 'c808eb55-46aa-4e12-88f6-a36ffeb063b5',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });

    expect(res.status).toBe('SUCCEEDED');
    expect(res.requires3ds).toBe(false);
    expect(res.amount).toBe(1500.0);
    expect(res.transactionId).toMatch(/^txn_mock_/);
  });

  it('should decline payment when token is tok_declined', async () => {
    const res = await gateway.processPayment({
      token: 'tok_declined',
      amount: 250.0,
      currency: 'USD',
      invoiceId: 'c808eb55-46aa-4e12-88f6-a36ffeb063b5',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });

    expect(res.status).toBe('FAILED');
    expect(res.requires3ds).toBe(false);
    expect(res.declineReason).toContain('card_declined');
  });

  it('should trigger 3DS redirect when token is tok_3ds', async () => {
    const res = await gateway.processPayment({
      token: 'tok_3ds',
      amount: 9900.0,
      currency: 'USD',
      invoiceId: 'c808eb55-46aa-4e12-88f6-a36ffeb063b5',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });

    expect(res.status).toBe('REQUIRES_ACTION');
    expect(res.requires3ds).toBe(true);
    expect(res.redirectUrl).toContain('3ds-challenge');
  });

  it('should generate and verify valid HMAC-SHA256 webhook signatures', () => {
    const payload = JSON.stringify({
      eventId: 'evt_test_123',
      eventType: 'payment_intent.succeeded',
      amount: 500,
    });
    const secret = 'whsec_test_mock_secret_key_360';
    const sig = gateway.generateSignature(payload, secret);

    expect(gateway.verifyWebhookSignature(payload, sig, secret)).toBe(true);
    expect(gateway.verifyWebhookSignature(payload, 'tampered_signature', secret)).toBe(false);
  });
});
