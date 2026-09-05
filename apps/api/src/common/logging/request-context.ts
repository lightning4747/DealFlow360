import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  correlationId: string;
  tenantId?: string;
  userId?: string;
  [key: string]: any;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getCorrelationId(): string {
  const store = requestContext.getStore();
  return store?.correlationId || 'no-correlation-id';
}

export function getTenantId(): string | undefined {
  const store = requestContext.getStore();
  return store?.tenantId;
}

export function runWithContext<T>(store: RequestStore, fn: () => T): T {
  return requestContext.run(store, fn);
}
