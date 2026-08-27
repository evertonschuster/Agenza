import { logger } from '@/shared/logger';
import type { AuthEvent } from '../domain/authEvent';

/** No external transmission (spec FR-015). */
export function logAuthEvent(type: AuthEvent['type'], tenantId: string | null): void {
  const event: AuthEvent = { type, timestamp: Date.now(), tenantId };
  const level = type === 'login_failure' || type === 'renewal_failure' ? 'warn' : 'info';
  logger[level](`auth.${type}`, { tenantId: event.tenantId, timestamp: event.timestamp });
}
