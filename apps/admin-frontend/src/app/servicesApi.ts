import { createApiClient } from '@/shared/api/apiClient';
import { createServicesFacade } from '@/shared/api/servicesFacade';
import { getAuthCredentials } from '@/features/auth';

/**
 * The single services-service client for the whole app.
 *
 * `createApiClient` attaches `Authorization: Bearer <token>` and `X-Tenant-Id` on every request
 * from the live auth session; `createServicesFacade` pre-fills the API version, unwraps the
 * response envelope, and turns every outcome into an `ApiResult`. A repository just calls
 * `servicesApi.get(...)` / `.post(...)` — it never states the token, the tenant, the version, or
 * touches an exception.
 */
export const servicesApi = createServicesFacade(createApiClient(getAuthCredentials));
