import { describe, expect, it, vi } from 'vitest';

const { createApiClientMock, createServicesFacadeMock, fakeClient, fakeFacade } = vi.hoisted(() => {
  const fakeClient = { name: 'raw-client' };
  const fakeFacade = { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() };
  return {
    createApiClientMock: vi.fn(() => fakeClient),
    createServicesFacadeMock: vi.fn(() => fakeFacade),
    fakeClient,
    fakeFacade,
  };
});

vi.mock('@/shared/api/apiClient', () => ({ createApiClient: createApiClientMock }));
vi.mock('@/shared/api/servicesFacade', () => ({ createServicesFacade: createServicesFacadeMock }));

import { getAuthCredentials } from '@/features/auth';
import { servicesApi } from './servicesApi';

describe('servicesApi', () => {
  it('wraps a credentials-bound API client in the services facade', () => {
    // The client reads the live session via getAuthCredentials; the facade wraps it.
    // Header injection is covered in shared/api/apiClient.test.ts and servicesFacade.test.ts.
    expect(createApiClientMock).toHaveBeenCalledWith(getAuthCredentials);
    expect(createServicesFacadeMock).toHaveBeenCalledWith(fakeClient);
    expect(servicesApi).toBe(fakeFacade);
  });
});
