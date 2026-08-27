export interface TenantContext {
  tenantId: string;
}

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

/** Tenant comes only from the token's `tenant_id` claim (FR-005) — never URL/storage (FR-006). */
export function resolveTenantContext(accessToken: string | null): TenantContext | null {
  if (!accessToken) return null;
  const claims = decodeAccessTokenClaims(accessToken);
  const tenantId = claims?.tenant_id;
  if (typeof tenantId !== 'string' || tenantId.length === 0) return null;
  return { tenantId };
}
