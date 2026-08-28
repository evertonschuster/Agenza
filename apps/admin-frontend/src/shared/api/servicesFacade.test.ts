import { describe, expect, it, vi, beforeEach } from 'vitest';
import createClient from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { createServicesFacade } from './servicesFacade';

const CATEGORY = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createServicesFacade', () => {
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
  const api = createServicesFacade(
    createClient<paths>({ baseUrl: 'http://services.test', fetch: fetchMock }),
  );

  beforeEach(() => fetchMock.mockReset());

  it('injects the API version and a tenant header so callers pass neither', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [CATEGORY] }));

    await api.get('/api/v{version}/categories', { query: { Search: 'cab' } });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe('/api/v1.0/categories');
    expect(new URL(request.url).searchParams.get('Search')).toBe('cab');
    expect(request.headers.has('X-Tenant-Id')).toBe(true); // real value comes from createApiClient's middleware
  });

  it('unwraps the response envelope on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [CATEGORY], success: true }));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result).toEqual({ ok: true, data: [CATEGORY] });
  });

  it('returns a not_found failure for 404 (never throws)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'Not Found', status: 404 }, 404));

    const result = await api.get('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not_found');
  });

  it('returns a validation failure with field issues for 400', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: 'Inválido', errors: { name: [{ message: 'Obrigatório' }] } }, 400),
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

  it('returns a network failure when the request never resolves', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('network');
  });

  it('returns a server failure when a 2xx body has no envelope data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null, success: false }));

    const result = await api.get('/api/v{version}/categories', { query: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('server');
  });

  it('treats 204 No Content as success with no payload', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } });

    expect(result).toEqual({ ok: true, data: undefined });
  });
});
