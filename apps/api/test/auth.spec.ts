import { AuthService } from '../src/modules/auth/auth.service';
import * as jwt from 'jsonwebtoken';
import { db, customers, quotes, sqlClient } from '@dealflow360/database';
import { eq } from 'drizzle-orm';

describe('Unit Test: Authentication Service, Tokens & Magic Links', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  afterAll(async () => {
    await authService.close();
    await sqlClient.end();
  });

  it('should authenticate valid admin user and return signed JWT pair', async () => {
    const result = await authService.login({
      email: 'admin@dealflow360.com',
      password: 'password123',
    });

    expect(result).toBeDefined();
    expect(result.user.email).toBe('admin@dealflow360.com');
    expect(result.user.role).toBe('admin');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();

    // Verify access token decode
    const decoded = jwt.decode(result.tokens.accessToken) as any;
    expect(decoded.email).toBe('admin@dealflow360.com');
    expect(decoded.role).toBe('admin');
    expect(decoded.type).toBe('access');
  });

  it('should reject invalid password with UnauthorizedException', async () => {
    await expect(
      authService.login({
        email: 'admin@dealflow360.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow();
  });

  it('should generate a cryptographic single-use magic link token', async () => {
    const [customer] = await db.select().from(customers).where(eq(customers.email, 'procurement@acme.com')).limit(1);
    const [quote] = customer
      ? await db.select().from(quotes).where(eq(quotes.customerId, customer.id)).limit(1)
      : [];
    expect(customer).toBeDefined();
    expect(quote).toBeDefined();
    const quoteId = quote!.id;
    const email = customer!.email;

    const result = await authService.generateMagicLink({ quoteId, email });
    expect(result.token).toBeDefined();
    expect(result.token.length).toBe(64); // 32 bytes hex
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify magic link consumption
    const verifyResult = await authService.verifyMagicLink({
      token: result.token,
      quoteId,
    });

    expect(verifyResult.portalToken).toBeDefined();
    expect(verifyResult.quoteId).toBe(quoteId);

    // Replay attack prevention: second verification must fail
    await expect(
      authService.verifyMagicLink({
        token: result.token,
        quoteId,
      }),
    ).rejects.toThrow();
  });
});
