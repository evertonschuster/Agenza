import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { loadEnv } from '@/shared/env';

export interface ApiClientCredentials {
  accessToken: string | null;
  tenantId: string | null;
}

/**
 * The single entry point for calling `services-service` (constitution Principle IV;
 * contracts/api-client-contract.md). No feature or component may construct its own `fetch`
 * call or hand-written request/response DTO against this service.
 *
 * Takes a narrow `{ accessToken, tenantId }` shape rather than the `auth` feature's own
 * `Session`/`TenantContext` types — `shared/` must not depend on `features/*` (the reverse
 * of the intended dependency direction); callers adapt their own richer types to this shape.
 */
export function createApiClient(credentials: ApiClientCredentials): Client<paths> {
  const env = loadEnv();
  const client = createClient<paths>({ baseUrl: env.apiBaseUrl });

  client.use({
    onRequest({ request }) {
      if (credentials.accessToken) {
        request.headers.set('Authorization', `Bearer ${credentials.accessToken}`);
      }
      if (credentials.tenantId) {
        request.headers.set('X-Tenant-Id', credentials.tenantId);
      }
      return request;
    },
  });

  return client;
}
