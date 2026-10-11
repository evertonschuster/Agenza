import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MissingSessionError, createApiClient, serializeBody } from './apiClient';

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

  it('sends a Date in the body as a calendar day, not as an instant', async () => {
    const client = createApiClient(() => ({ accessToken: 'token-1', tenantId: 'tenant-1' }));

    await client.POST('/api/v{version}/clients', {
      params: { path: { version: '1.0' } },
      body: {
        fullName: 'Maria Souza',
        birthDate: new Date('2016-06-15T00:00:00Z'),
        phone: null,
        email: null,
        cpf: null,
        administrativeNotes: null,
        guardians: [],
        referenceContacts: [],
      },
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(JSON.parse(await request.text())).toMatchObject({ birthDate: '2016-06-15' });
  });

  it.each([
    ['accessToken', { accessToken: null, tenantId: 'tenant-1' }],
    ['tenantId', { accessToken: 'token-1', tenantId: null }],
  ] as const)(
    'fails closed with a MissingSessionError instead of sending a request when %s is missing',
    async (_label, credentials) => {
      const client = createApiClient(() => credentials);

      await expect(client.GET(CATEGORIES_PATH, REQUEST_PARAMS)).rejects.toThrow(
        MissingSessionError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe('serializeBody', () => {
  it('turns every Date, however deep, into yyyy-MM-dd and leaves other values alone', () => {
    const body = {
      name: 'Maria',
      count: 2,
      nothing: null,
      from: new Date('1990-05-20T00:00:00Z'),
      nested: { items: [{ day: new Date('2000-02-29T00:00:00Z') }, 'text'] },
    };

    expect(JSON.parse(serializeBody(body))).toEqual({
      name: 'Maria',
      count: 2,
      nothing: null,
      from: '1990-05-20',
      nested: { items: [{ day: '2000-02-29' }, 'text'] },
    });
  });

  it('reads the UTC day, whatever the zone of the device', () => {
    expect(serializeBody({ day: new Date('2015-03-10T23:59:59Z') })).toBe('{"day":"2015-03-10"}');
  });
});
