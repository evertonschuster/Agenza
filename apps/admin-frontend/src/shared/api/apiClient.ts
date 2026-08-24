import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { loadEnv } from '@/shared/env';

export interface ApiClientCredentials {
  accessToken: string | null;
  tenantId: string | null;
}

/** Single entry point for services-service (contracts/api-client-contract.md). Narrow
 * `{ accessToken, tenantId }` shape, not auth's types — `shared/` can't depend on `features/*`. */
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
