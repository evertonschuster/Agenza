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

  it('forwards an AbortSignal to the transport', async () => {
    GET.mockResolvedValue(raw({ data: { data: [] } }));
    const controller = new AbortController();

    await api.get('/api/v{version}/categories', { query: {}, signal: controller.signal });

    expect(GET).toHaveBeenCalledWith('/api/v{version}/categories', {
      params: { path: { version: '1.0' }, query: {} },
      body: undefined,
      signal: controller.signal,
    });
  });

  it('unwraps the response envelope on success', async () => {
    GET.mockResolvedValue(raw({ data: { data: [CATEGORY], success: true } }));

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: true,
      data: [CATEGORY],
    });
  });

  it('passes the Problem Details body through on an error response', async () => {
    const problem = {
      title: "Categoria '…' não foi encontrada.",
      status: 404,
      code: 'Category.NotFound',
      errors: { '': [{ code: 'Category.NotFound', message: '…' }] },
    };
    GET.mockResolvedValue(raw({ error: problem, status: 404 }));

    const result = await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(result).toEqual({ ok: false, error: problem });
  });

  it('treats 204 No Content as success with no payload', async () => {
    DELETE.mockResolvedValue(raw({ data: undefined, status: 204 }));

    expect(await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } })).toEqual(
      { ok: true, data: undefined },
    );
  });
});
