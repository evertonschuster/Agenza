import { createApiClient } from '@/shared/api/apiClient';
import { createServicesFacade } from '@/shared/api/servicesFacade';
import { getAuthCredentials } from '@/shared/session/sessionStore';

export const servicesApi = createServicesFacade(createApiClient(getAuthCredentials));
