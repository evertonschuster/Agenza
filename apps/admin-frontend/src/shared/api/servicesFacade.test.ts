import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { createServicesFacade } from './servicesFacade';

const CATEGORY = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };

interface RawShape {
  data?: unknown;
  error?: unknown;
  response: Response;
}

// Stand-in for the openapi-fetch client. The facade's job is what it hands to this client, and how
// it turns the client's `{ data, error, response }` (or a rejection) into an ApiResult.
const GET = vi.fn<(path: string, init: unknown) => Promise<RawShape>>();
const DELETE = vi.fn<(path: string, init: unknown) => Promise<RawShape>>();
const fakeClient = { GET, DELETE, POST: vi.fn(), PUT: vi.fn() } as unknown as Client<paths>;
const api = createServicesFacade(fakeClient);

const raw = (over: { data?: unknown; error?: unknown; status?: number }): RawShape => ({
  data: over.data,
  error: over.error,
  response: new Response(null, { status: over.status ?? 200 }),
});

describe('createServicesFacade', () => {
  beforeEach(() => {
    GET.mockReset();
    DELETE.mockReset();
  });

  it('injects the API version and the tenant header — callers pass neither', async () => {
    GET.mockResolvedValue(raw({ data: { data: [CATEGORY] } }));

    await api.get('/api/v{version}/categories', { query: { Search: 'cab' } });

    expect(GET).toHaveBeenCalledWith('/api/v{version}/categories', {
      params: {
        path: { version: '1.0' },
        query: { Search: 'cab' },
        header: { 'X-Tenant-Id': '' }, // real value is set by createApiClient's middleware
      },
      body: undefined,
    });
  });

  it('merges caller path params with the injected version', async () => {
    GET.mockResolvedValue(raw({ data: { data: CATEGORY } }));

    await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(GET).toHaveBeenCalledWith('/api/v{version}/categories/{id}', {
      params: {
        path: { version: '1.0', id: CATEGORY.id },
        query: undefined,
        header: { 'X-Tenant-Id': '' },
      },
      body: undefined,
    });
  });

  it('unwraps the response envelope on success', async () => {
    GET.mockResolvedValue(raw({ data: { data: [CATEGORY], success: true } }));

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: true,
      data: [CATEGORY],
    });
  });

  it('returns a not_found failure for 404 (never throws)', async () => {
    GET.mockResolvedValue(raw({ error: { title: 'Not Found', status: 404 }, status: 404 }));

    const result = await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not_found');
  });

  it('returns a validation failure with field issues for 400', async () => {
    GET.mockResolvedValue(
      raw({
        error: { detail: 'Inválido', errors: { name: [{ message: 'Obrigatório' }] } },
        status: 400,
      }),
    );

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
      expect(result.error.fieldIssues).toEqual([
        { field: 'name', message: 'Obrigatório', code: null },
      ]);
    }
  });

  it('returns a network failure when the client rejects', async () => {
    GET.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('network');
  });

  it('returns a server failure when a 2xx body has no envelope data', async () => {
    GET.mockResolvedValue(raw({ data: { data: null, success: false } }));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('server');
  });

  it('treats 204 No Content as success with no payload', async () => {
    DELETE.mockResolvedValue(raw({ data: undefined, status: 204 }));

    expect(await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } })).toEqual(
      {
        ok: true,
        data: undefined,
      },
    );
  });
});
