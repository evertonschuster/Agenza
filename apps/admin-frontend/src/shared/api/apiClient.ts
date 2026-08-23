import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { loadEnv } from '@/shared/env';
import type { Session, TenantContext } from '@/features/auth/types';

/**
 * The single entry point for calling `services-service` (constitution Principle IV;
 * contracts/api-client-contract.md). No feature or component may construct its own `fetch`
 * call or hand-written request/response DTO against this service.
 */
export function createApiClient(session: Session, tenant: TenantContext | null): Client<paths> {
  const env = loadEnv();
  const client = createClient<paths>({ baseUrl: env.apiBaseUrl });

  client.use({
    onRequest({ request }) {
      if (session.accessToken) {
        request.headers.set('Authorization', `Bearer ${session.accessToken}`);
      }
      if (tenant) {
        request.headers.set('X-Tenant-Id', tenant.tenantId);
      }
      return request;
    },
  });

  return client;
}
