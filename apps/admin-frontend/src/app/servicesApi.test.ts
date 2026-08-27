import { describe, expect, it, vi } from 'vitest';

const { createApiClientMock } = vi.hoisted(() => ({
  createApiClientMock: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('@/shared/api/apiClient', () => ({ createApiClient: createApiClientMock }));

import { getAuthCredentials } from '@/features/auth';
import { servicesApi } from './servicesApi';

describe('servicesApi', () => {
  it('is a single client built from the live auth-session credentials getter', () => {
    // Header injection + fail-closed behaviour is covered in shared/api/apiClient.test.ts;
    // getAuthCredentials reading the live session is covered in
    // features/auth/application/sessionStore.test.ts. This only checks the wiring.
    expect(createApiClientMock).toHaveBeenCalledTimes(1);
    expect(createApiClientMock).toHaveBeenCalledWith(getAuthCredentials);
    expect(servicesApi).toBe(createApiClientMock.mock.results[0]?.value);
  });
});
