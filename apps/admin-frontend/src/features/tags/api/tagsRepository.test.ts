import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tagsRepository } from './tagsRepository';

const { mockDel, mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockDel: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('@/shared/api/servicesApi', () => ({
  servicesApi: { del: mockDel, get: mockGet, post: mockPost, put: mockPut },
}));

describe('tagsRepository.list', () => {
  const FIRST_PAGE_OF_EVERY_TAG = { search: '', page: 1, pageSize: 20 };
  const EMPTY_PAGE = { ok: true, data: { items: [], totalCount: 0, page: 1, pageSize: 20 } };

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('always asks for a page and a size, so the screen never depends on the backend defaults', async () => {
    mockGet.mockResolvedValue(EMPTY_PAGE);

    await tagsRepository.list(FIRST_PAGE_OF_EVERY_TAG);

    expect(mockGet).toHaveBeenCalledExactlyOnceWith('/api/v{version}/tags', {
      query: { Page: 1, PageSize: 20 },
      signal: undefined,
    });
  });

  it('sends the page, the size and the search term under the names the API reads, in one request', async () => {
    mockGet.mockResolvedValue(EMPTY_PAGE);

    await tagsRepository.list({ search: 'vip', page: 3, pageSize: 50 });

    expect(mockGet).toHaveBeenCalledExactlyOnceWith('/api/v{version}/tags', {
      query: { Page: 3, PageSize: 50, Search: 'vip' },
      signal: undefined,
    });
  });

  it('leaves Search out, instead of sending it empty, without a search term', async () => {
    mockGet.mockResolvedValue(EMPTY_PAGE);

    await tagsRepository.list(FIRST_PAGE_OF_EVERY_TAG);

    const [, options] = mockGet.mock.calls.at(-1) as [string, { query: object }];
    expect(options.query).not.toHaveProperty('Search');
  });

  it('hands the abort signal over to the request', async () => {
    mockGet.mockResolvedValue(EMPTY_PAGE);
    const controller = new AbortController();

    await tagsRepository.list(FIRST_PAGE_OF_EVERY_TAG, controller.signal);

    const [, options] = mockGet.mock.calls.at(-1) as [string, { signal: AbortSignal }];
    expect(options.signal).toBe(controller.signal);
  });

  it('forwards the whole page verbatim, with the items and the paging data', async () => {
    const tag = { id: '1', name: 'VIP', color: '#0d9488', description: null };
    const page = { items: [tag], totalCount: 21, page: 2, pageSize: 20 };
    mockGet.mockResolvedValue({ ok: true, data: page });

    const result = await tagsRepository.list({ search: '', page: 2, pageSize: 20 });

    expect(result).toEqual({ ok: true, data: page });
  });

  it('forwards a failed result verbatim, without throwing (e.g. a search past the limit)', async () => {
    const error = {
      status: 400,
      code: 'Validation.Failed',
      title: 'A busca deve ter no máximo 254 caracteres.',
    };
    mockGet.mockResolvedValue({ ok: false, error });

    const result = await tagsRepository.list({ search: 'x', page: 1, pageSize: 20 });

    expect(result).toEqual({ ok: false, error });
  });
});

describe('tagsRepository.get', () => {
  it('sends the id as a path param to GET /tags/{id} and forwards the result verbatim', async () => {
    const tag = { id: '1', name: 'Promoção', color: '#f59e0b', description: null };
    mockGet.mockResolvedValue({ ok: true, data: tag });

    const result = await tagsRepository.get('1');

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/tags/{id}', { path: { id: '1' } });
    expect(result).toEqual({ ok: true, data: tag });
  });

  it('forwards a failed result verbatim (e.g. not found)', async () => {
    const error = { status: 404, code: 'Tag.NotFound', title: "Etiqueta '1' não foi encontrada." };
    mockGet.mockResolvedValue({ ok: false, error });

    const result = await tagsRepository.get('1');

    expect(result).toEqual({ ok: false, error });
  });
});

describe('tagsRepository.create', () => {
  it('posts name/color/description to POST /tags and forwards the result verbatim', async () => {
    const tag = { id: '1', name: 'Promoção', color: '#f59e0b', description: null };
    mockPost.mockResolvedValue({ ok: true, data: tag });

    const result = await tagsRepository.create({
      name: 'Promoção',
      color: '#f59e0b',
      description: null,
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v{version}/tags', {
      body: { name: 'Promoção', color: '#f59e0b', description: null },
    });
    expect(result).toEqual({ ok: true, data: tag });
  });

  it('forwards a failed result verbatim (e.g. duplicate name)', async () => {
    const error = {
      status: 409,
      code: 'Tag.DuplicateName',
      title: "Já existe uma etiqueta chamada 'Promoção'.",
    };
    mockPost.mockResolvedValue({ ok: false, error });

    const result = await tagsRepository.create({
      name: 'Promoção',
      color: '#f59e0b',
      description: null,
    });

    expect(result).toEqual({ ok: false, error });
  });
});

describe('tagsRepository.update', () => {
  it('sends the id as both a path param and the body tagId to PUT /tags/{id}', async () => {
    const tag = { id: '1', name: 'VIP', color: '#8b5cf6', description: 'Clientes premium' };
    mockPut.mockResolvedValue({ ok: true, data: tag });

    const result = await tagsRepository.update('1', {
      name: 'VIP',
      color: '#8b5cf6',
      description: 'Clientes premium',
    });

    expect(mockPut).toHaveBeenCalledWith('/api/v{version}/tags/{id}', {
      path: { id: '1' },
      body: { tagId: '1', name: 'VIP', color: '#8b5cf6', description: 'Clientes premium' },
    });
    expect(result).toEqual({ ok: true, data: tag });
  });

  it('forwards a failed result verbatim (e.g. not found)', async () => {
    const error = { status: 404, code: 'Tag.NotFound', title: "Etiqueta '1' não foi encontrada." };
    mockPut.mockResolvedValue({ ok: false, error });

    const result = await tagsRepository.update('1', {
      name: 'VIP',
      color: '#8b5cf6',
      description: null,
    });

    expect(result).toEqual({ ok: false, error });
  });
});

describe('tagsRepository.delete', () => {
  it('sends the id as a path param to DELETE /tags/{id} and forwards the result verbatim', async () => {
    mockDel.mockResolvedValue({ ok: true, data: undefined });

    const result = await tagsRepository.delete('42');

    expect(mockDel).toHaveBeenCalledWith('/api/v{version}/tags/{id}', { path: { id: '42' } });
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('forwards a failed result verbatim', async () => {
    const error = { status: 409, code: 'Tag.InUse', title: 'Etiqueta em uso por 2 serviços.' };
    mockDel.mockResolvedValue({ ok: false, error });

    const result = await tagsRepository.delete('42');

    expect(result).toEqual({ ok: false, error });
  });
});
