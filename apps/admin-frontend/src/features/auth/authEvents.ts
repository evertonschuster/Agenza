import { logger } from '@/shared/logger';
import type { AuthEvent } from './types';

/** Minimal local logging of auth/session lifecycle events (spec FR-015) — no external transmission. */
export function logAuthEvent(type: AuthEvent['type'], tenantId: string | null): void {
  const event: AuthEvent = { type, timestamp: Date.now(), tenantId };
  const level = type === 'login_failure' || type === 'renewal_failure' ? 'warn' : 'info';
  logger[level](`auth.${type}`, { tenantId: event.tenantId, timestamp: event.timestamp });
}
