import { describe, expect, it, vi, beforeEach } from 'vitest';
import { utcDate } from '@/shared/format/date';
import { MissingSessionError, createApiClient, reviveDates } from './apiClient';

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

describe('reviveDates', () => {
  it('turns every day of a list of dates into a Date', () => {
    expect(reviveDates({ birthDate: ['1990-05-20', null] })).toEqual({
      birthDate: [utcDate(1990, 5, 20), null],
    });
  });

  it('finds a contract date inside an object nested in a list', () => {
    expect(reviveDates({ guardians: [{ person: { birthDate: '2000-02-29' } }] })).toEqual({
      guardians: [{ person: { birthDate: utcDate(2000, 2, 29) } }],
    });
  });

  it('turns a contract date, however deep, into a Date at midnight UTC', () => {
    expect(
      reviveDates({
        birthDate: '1990-05-20',
        items: [{ birthDate: '2000-02-29' }, { birthDate: null }],
      }),
    ).toEqual({
      birthDate: utcDate(1990, 5, 20),
      items: [{ birthDate: utcDate(2000, 2, 29) }, { birthDate: null }],
    });
  });

  it('leaves a value alone when the contract does not call its field a date', () => {
    const body = { administrativeNotes: '2020-01-01', timestamp: '2026-10-23T14:00:00Z' };

    expect(reviveDates(body)).toEqual(body);
  });

  it('leaves a date field alone when its value is not a yyyy-MM-dd day', () => {
    expect(reviveDates({ birthDate: '2015-03-10T00:00:00Z' })).toEqual({
      birthDate: '2015-03-10T00:00:00Z',
    });
  });

  it.each([null, undefined, 'texto', 3, true])('returns %j as it came', (value) => {
    expect(reviveDates(value)).toBe(value);
  });
});
