import { createApiClient } from '@/shared/api/apiClient';
import { createServicesFacade } from '@/shared/api/servicesFacade';
import { getAuthCredentials } from '@/features/auth';

export const servicesApi = createServicesFacade(createApiClient(getAuthCredentials));
