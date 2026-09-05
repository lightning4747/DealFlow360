import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  LoginRequest,
  SignupRequest,
  AuthTokenResponse,
  MagicLinkRequest,
  MagicLinkVerify,
} from '@dealflow360/types';
import { db, users, magicLinks } from '@dealflow360/database';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis | null = null;
  private readonly jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_dealflow360_change_in_production';
  private readonly refreshSecret = process.env.REFRESH_SECRET || 'super_secret_refresh_key_dealflow360';
  private readonly magicLinkSecret = process.env.PORTAL_MAGIC_LINK_SECRET || 'super_secret_magic_link_key_dealflow360';

  constructor() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, { lazyConnect: true, retryStrategy: () => null });
      this.redis.connect().catch((err) => {
        console.warn('⚠️ Redis not reachable directly, fallback in-memory mode active:', err.message);
      });
    } catch {
      this.redis = null;
    }
  }

  async close() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }

  async login(credentials: LoginRequest): Promise<AuthTokenResponse> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const isMatch = await bcrypt.compare(credentials.password, user.hashedPassword);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const tokenId = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        tokenId,
        type: 'refresh',
      },
      this.refreshSecret,
      { expiresIn: '7d' },
    );

    // Persist refresh token in Redis with 7-day TTL if available
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(`refresh:${user.id}:${tokenId}`, 'valid', 'EX', 7 * 24 * 3600);
      } catch (err: any) {
        console.warn('Could not store refresh token in Redis:', err.message);
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    };
  }

  async signup(dto: SignupRequest): Promise<AuthTokenResponse> {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists',
        statusCode: 409,
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        email: dto.email,
        name: dto.name,
        role: dto.role as any,
        hashedPassword,
      })
      .returning();

    const tokenId = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: newUser.id,
        email: newUser.email,
        role: newUser.role,
        type: 'access',
      },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        sub: newUser.id,
        tokenId,
        type: 'refresh',
      },
      this.refreshSecret,
      { expiresIn: '7d' },
    );

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(`refresh:${newUser.id}:${tokenId}`, 'valid', 'EX', 7 * 24 * 3600);
      } catch (err: any) {
        console.warn('Could not store refresh token in Redis:', err.message);
      }
    }

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as any,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    };
  }

  async generateMagicLink(req: MagicLinkRequest): Promise<{ token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(magicLinks).values({
      tokenHash,
      quoteId: req.quoteId,
      email: req.email,
      expiresAt,
    });

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(
          `magic:${token}`,
          JSON.stringify({ quoteId: req.quoteId, email: req.email }),
          'EX',
          86400,
        );
      } catch (err: any) {
        console.warn('Could not store magic link in Redis:', err.message);
      }
    }

    return { token, expiresAt };
  }

  async verifyMagicLink(verify: MagicLinkVerify): Promise<{ portalToken: string; quoteId: string }> {
    if (!verify.token || !verify.quoteId) {
      throw new BadRequestException({
        code: 'INVALID_MAGIC_LINK',
        message: 'Token and quoteId are required',
        statusCode: 400,
      });
    }

    const tokenHash = crypto.createHash('sha256').update(verify.token).digest('hex');
    const [record] = await db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, tokenHash), eq(magicLinks.quoteId, verify.quoteId)))
      .limit(1);

    if (!record) {
      throw new UnauthorizedException({
        code: 'INVALID_MAGIC_LINK',
        message: 'Invalid magic link token',
        statusCode: 401,
      });
    }

    if (new Date() > new Date(record.expiresAt)) {
      throw new UnauthorizedException({
        code: 'MAGIC_LINK_EXPIRED',
        message: 'Magic link has expired',
        statusCode: 401,
      });
    }

    if (record.usedAt) {
      throw new UnauthorizedException({
        code: 'MAGIC_LINK_ALREADY_USED',
        message: 'Magic link has already been used',
        statusCode: 401,
      });
    }

    // Mark token as used (single-use semantics)
    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, record.id));

    // Sign stateless portal session JWT
    const portalToken = jwt.sign(
      {
        sub: record.quoteId,
        quoteId: record.quoteId,
        email: record.email,
        type: 'portal',
      },
      this.jwtSecret,
      { expiresIn: '24h' },
    );

    return {
      portalToken,
      quoteId: record.quoteId,
    };
  }
}
