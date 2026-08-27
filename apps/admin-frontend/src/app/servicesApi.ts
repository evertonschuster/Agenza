import { createApiClient } from '@/shared/api/apiClient';
import { getAuthCredentials } from '@/features/auth';

/**
 * The single services-service client for the whole app. `createApiClient`'s middleware injects
 * `Authorization: Bearer <access token>` and `X-Tenant-Id` on every request, reading them live
 * from the auth session via `getAuthCredentials` — so it stays correct across silent renewal and
 * tenant changes, and fails closed (throws) if used without an authenticated session.
 *
 * Features import this directly and call `servicesApi.GET(...)` etc. — they never build their own
 * client or call `fetch` (constitution Principle IV).
 */
export const servicesApi = createApiClient(getAuthCredentials);
