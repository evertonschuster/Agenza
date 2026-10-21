import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Client } from 'openapi-fetch';
import type { paths } from './generated/services-api.d.ts';
import { MissingSessionError } from './apiClient';
import {
  NETWORK_PROBLEM,
  RATE_LIMIT_PROBLEM,
  SERVER_PROBLEM,
  SESSION_PROBLEM,
  createServicesFacade,
  describeProblem,
  isTransientProblem,
} from './servicesFacade';
import type { ApiProblem } from './servicesFacade';

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

  it('normalizes a transport rejection to NETWORK_PROBLEM (the call never rejects)', async () => {
    GET.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: false,
      error: NETWORK_PROBLEM,
    });
  });

  it('maps a missing-session throw to SESSION_PROBLEM, not a dead network', async () => {
    GET.mockRejectedValue(new MissingSessionError());

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: false,
      error: SESSION_PROBLEM,
    });
  });

  it('normalizes a non-2xx with no Problem body to SERVER_PROBLEM', async () => {
    GET.mockResolvedValue(raw({ error: '<html>502 Bad Gateway</html>', status: 502 }));

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: false,
      error: SERVER_PROBLEM,
    });
  });

  it('maps a 429 with an empty body to RATE_LIMIT_PROBLEM, not to a failing server', async () => {
    GET.mockResolvedValue(raw({ error: undefined, status: 429 }));

    expect(await api.get('/api/v{version}/categories', { query: {} })).toEqual({
      ok: false,
      error: RATE_LIMIT_PROBLEM,
    });
  });

  it('maps a 429 to RATE_LIMIT_PROBLEM even when the body is a Problem, so the copy stays ours', async () => {
    const problem = { title: 'Limite excedido.', status: 429, code: 'Throttle.Hit' };
    DELETE.mockResolvedValue(raw({ error: problem, status: 429 }));

    expect(await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } })).toEqual(
      { ok: false, error: RATE_LIMIT_PROBLEM },
    );
  });

  it('treats 204 No Content as success with no payload', async () => {
    DELETE.mockResolvedValue(raw({ data: undefined, status: 204 }));

    expect(await api.del('/api/v{version}/categories/{id}', { path: { id: CATEGORY.id } })).toEqual(
      { ok: true, data: undefined },
    );
  });
});

describe('describeProblem', () => {
  it('puts the code on its own line under the message', () => {
    const problem: ApiProblem = {
      status: 404,
      code: 'Tag.NotFound',
      title: 'Etiqueta não achada.',
    };

    expect(describeProblem(problem)).toBe('Etiqueta não achada.\nCódigo: Tag.NotFound');
  });

  it('prefers the curated message under the empty key, as extractErrorMessage does', () => {
    const problem: ApiProblem = {
      status: 409,
      code: 'Tag.DuplicateName',
      title: 'Conflito.',
      errors: { '': [{ message: 'Já existe uma etiqueta com esse nome.' }] },
    };

    expect(describeProblem(problem)).toBe(
      'Já existe uma etiqueta com esse nome.\nCódigo: Tag.DuplicateName',
    );
  });

  it('is only the message when the problem has no code', () => {
    const problem: ApiProblem = { status: 400, title: 'Requisição inválida.' };

    expect(describeProblem(problem)).toBe('Requisição inválida.');
  });
});

describe('isTransientProblem', () => {
  it.each([
    ['NETWORK_PROBLEM', NETWORK_PROBLEM],
    ['SESSION_PROBLEM', SESSION_PROBLEM],
    ['SERVER_PROBLEM', SERVER_PROBLEM],
    ['RATE_LIMIT_PROBLEM', RATE_LIMIT_PROBLEM],
  ])('treats %s as transient', (_name, problem) => {
    expect(isTransientProblem(problem)).toBe(true);
  });

  it('treats a domain error code as not transient', () => {
    const problem: ApiProblem = { status: 409, code: 'Tag.InUse', title: '…' };

    expect(isTransientProblem(problem)).toBe(false);
  });

  it('treats a 4xx with no code, like ASP.NET native model binding, as not transient', () => {
    const problem: ApiProblem = { status: 400, title: '…' };

    expect(isTransientProblem(problem)).toBe(false);
  });

  it.each([
    ['a backend 500 carrying its own problem body', { status: 500, code: 'Unexpected.Error' }],
    ['a 503 with no code', { status: 503 }],
  ])('treats %s as transient, so it can be retried', (_name, fields) => {
    const problem: ApiProblem = { ...fields, title: '…' };

    expect(isTransientProblem(problem)).toBe(true);
  });

  it('treats a status that arrives as text, which the generated type no longer allows, as transient', () => {
    const problem = { status: '502', title: '…' } as unknown as ApiProblem;

    expect(isTransientProblem(problem)).toBe(true);
  });
});
