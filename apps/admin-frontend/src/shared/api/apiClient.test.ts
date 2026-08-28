import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createApiClient } from './apiClient';

const CATEGORIES_PATH = '/api/v{version}/categories' as const;
const REQUEST_PARAMS = { params: { path: { version: '1.0' } } };

describe('createApiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('attaches Authorization and X-Tenant-Id on every request', async () => {
    const client = createApiClient(() => ({ accessToken: 'token-1', tenantId: 'tenant-1' }));

    await client.GET(CATEGORIES_PATH, REQUEST_PARAMS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(request.headers.get('X-Tenant-Id')).toBe('tenant-1');
  });

  it('reads credentials fresh on each request instead of the ones it was built with', async () => {
    let tenantId = 'tenant-1';
    const client = createApiClient(() => ({ accessToken: 'token-1', tenantId }));

    tenantId = 'tenant-2';
    await client.GET(CATEGORIES_PATH, REQUEST_PARAMS);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('X-Tenant-Id')).toBe('tenant-2');
  });

  it.each([
    ['accessToken', { accessToken: null, tenantId: 'tenant-1' }],
    ['tenantId', { accessToken: 'token-1', tenantId: null }],
  ] as const)(
    'fails closed instead of sending a request when %s is missing',
    async (_label, credentials) => {
      const client = createApiClient(() => credentials);

      await expect(client.GET(CATEGORIES_PATH, REQUEST_PARAMS)).rejects.toThrow(
        /authenticated session/,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
