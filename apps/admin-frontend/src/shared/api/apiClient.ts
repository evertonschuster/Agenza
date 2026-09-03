import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { loadEnv } from '@/shared/env';

export interface ApiClientCredentials {
  accessToken: string | null;
  tenantId: string | null;
}

export class MissingSessionError extends Error {
  constructor() {
    super('API request attempted without an authenticated session.');
    this.name = 'MissingSessionError';
  }
}

/** Single entry point for services-service (contracts/api-client-contract.md). Narrow
 * `{ accessToken, tenantId }` shape, not auth's types — `shared/` can't depend on `features/*`.
 * Takes a getter, not a value: the client is meant to be built once and reused, and reading
 * credentials fresh on every request (rather than closing over a snapshot) keeps it correct
 * across token renewal and tenant changes. */
export function createApiClient(getCredentials: () => ApiClientCredentials): Client<paths> {
  const env = loadEnv();
  const client = createClient<paths>({ baseUrl: env.apiBaseUrl });

  client.use({
    onRequest({ request }) {
      const { accessToken, tenantId } = getCredentials();
      if (!accessToken || !tenantId) {
        throw new MissingSessionError();
      }
      request.headers.set('Authorization', `Bearer ${accessToken}`);
      request.headers.set('X-Tenant-Id', tenantId);
      return request;
    },
  });

  return client;
}
