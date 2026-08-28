import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { NETWORK_PROBLEM } from './apiProblem';
import { createServicesFacade } from './servicesFacade';

const CATEGORY = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };

interface RawShape {
  data?: unknown;
  error?: unknown;
  response: Response;
}

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

  it('injects the API version — callers pass no version and no tenant header', async () => {
    GET.mockResolvedValue(raw({ data: { data: [CATEGORY] } }));

    await api.get('/api/v{version}/categories', { query: { Search: 'cab' } });

    expect(GET).toHaveBeenCalledWith('/api/v{version}/categories', {
      params: { path: { version: '1.0' }, query: { Search: 'cab' } },
      body: undefined,
    });
  });

  it('merges caller path params with the injected version', async () => {
    GET.mockResolvedValue(raw({ data: { data: CATEGORY } }));

    await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(GET).toHaveBeenCalledWith('/api/v{version}/categories/{id}', {
      params: { path: { version: '1.0', id: CATEGORY.id }, query: undefined },
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

  it('passes the Problem Details body straight through on an error response (never throws)', async () => {
    const problem = { title: 'Not Found', status: 404, code: 'Category.NotFound' };
    GET.mockResolvedValue(raw({ error: problem, status: 404 }));

    const result = await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(problem);
  });

  it('keeps the backend field errors intact on a 400', async () => {
    GET.mockResolvedValue(
      raw({
        error: { title: 'Inválido', status: 400, errors: { Name: [{ message: 'Obrigatório' }] } },
        status: 400,
      }),
    );

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors?.Name).toEqual([{ message: 'Obrigatório' }]);
  });

  it('returns the offline problem when the client rejects', async () => {
    GET.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result).toEqual({ ok: false, error: NETWORK_PROBLEM });
  });

  it('synthesizes a problem for a non-object error body', async () => {
    GET.mockResolvedValue(raw({ error: '<html>502</html>', status: 502 }));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('Http.Unexpected');
  });

  it('returns a synthesized problem when a 2xx body has no envelope data', async () => {
    GET.mockResolvedValue(raw({ data: { data: null, success: false } }));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('Http.Unexpected');
  });

  it('treats 204 No Content as success with no payload', async () => {
    DELETE.mockResolvedValue(raw({ data: undefined, status: 204 }));

    expect(await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } })).toEqual(
      { ok: true, data: undefined },
    );
  });
});
