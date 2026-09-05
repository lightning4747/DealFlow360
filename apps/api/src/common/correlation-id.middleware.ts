import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from './logging/request-context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    const tenantId = (req.headers['x-tenant-id'] as string) || undefined;
    const userId = (req.headers['x-user-id'] as string) || undefined;

    requestContext.run({ correlationId, tenantId, userId }, () => {
      next();
    });
  }
}
