import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DB } from '../database/database.module';
import { auditLogs } from '@dealflow360/database';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  stateBefore?: any;
  stateAfter?: any;
  metadata?: any;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async log(entry: AuditEntry, tx?: any): Promise<void> {
    const executor = tx || this.db;
    const isValidUuid = (val?: string) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    const safeActorId = isValidUuid(entry.actorId) ? entry.actorId : null;

    try {
      await executor.insert(auditLogs).values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: safeActorId,
        actorRole: entry.actorRole || null,
        stateBefore: entry.stateBefore || null,
        stateAfter: entry.stateAfter || null,
        metadata: {
          ...(entry.metadata || {}),
          ...(!safeActorId && entry.actorId ? { rawActorId: entry.actorId } : {}),
        },
      });
      this.logger.log(`Audit log written: ${entry.action} on ${entry.entityType}:${entry.entityId}`);
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`, err.stack);
      // Depending on policy, audit logging failure might throw or be reported
    }
  }

  async getLogsForEntity(entityType: string, entityId: string): Promise<any[]> {
    return this.db.query.auditLogs.findMany({
      where: (logs: any, { eq, and }: any) =>
        and(eq(logs.entityType, entityType), eq(logs.entityId, entityId)),
      orderBy: (logs: any, { desc }: any) => [desc(logs.createdAt)],
    });
  }
}
