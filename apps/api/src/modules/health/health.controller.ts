import { Controller, Get, HttpStatus, Res, Inject, Logger } from '@nestjs/common';
import { Response } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DB } from '../database/database.module';
import * as schema from '@dealflow360/database';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly redisClient: Redis;

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);
    this.redisClient = new Redis({
      host,
      port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  }

  /**
   * Shallow liveness check: verifies process is alive and accepting traffic
   */
  @Get()
  getLiveness(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Deep readiness check: verifies database, redis, and critical subsystems
   */
  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, { status: 'up' | 'down'; latencyMs?: number; error?: string }> = {};
    let isHealthy = true;

    // 1. PostgreSQL Database Check
    const dbStart = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = {
        status: 'up',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err: any) {
      isHealthy = false;
      checks.database = {
        status: 'down',
        error: err.message,
      };
    }

    // 2. Redis Check
    const redisStart = Date.now();
    try {
      if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connecting') {
        await this.redisClient.connect();
      }
      await this.redisClient.ping();
      checks.redis = {
        status: 'up',
        latencyMs: Date.now() - redisStart,
      };
    } catch (err: any) {
      // In local/dev graceful mode, log warning
      checks.redis = {
        status: 'down',
        error: err.message,
      };
      // For readiness, mark degraded if redis is down
      isHealthy = false;
    }

    const httpStatus = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(httpStatus).json({
      status: isHealthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  }
}
