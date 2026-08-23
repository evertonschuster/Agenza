import type { TenantContext } from './types';

function decodeAccessTokenClaims(accessToken: string): Record<string, unknown> | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves the tenant exclusively from the access token's `tenant_id` claim (spec FR-005).
 * Never reads from a URL, query string, or client-side storage (spec FR-006) — those aren't
 * even parameters here, by construction.
 */
export function resolveTenantContext(accessToken: string | null): TenantContext | null {
  if (!accessToken) return null;
  const claims = decodeAccessTokenClaims(accessToken);
  const tenantId = claims?.tenant_id;
  if (typeof tenantId !== 'string' || tenantId.length === 0) return null;
  return { tenantId };
}
