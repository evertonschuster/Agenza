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
  const tag = { id: '1', name: 'VIP', color: '#0d9488', description: null };

  function page(items: (typeof tag)[], totalCount: number, currentPage = 1) {
    return {
      ok: true,
      data: { items, totalCount, page: currentPage, pageSize: 100 },
    };
  }

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('reads the first bounded page and returns its tags to the existing screen', async () => {
    const response = page([tag], 1);
    mockGet.mockResolvedValueOnce(response);

    const result = await tagsRepository.list();

    expect(mockGet).toHaveBeenCalledExactlyOnceWith('/api/v{version}/tags', {
      query: { Page: 1, PageSize: 100 },
      signal: undefined,
    });
    expect(result).toEqual({ ok: true, data: [tag] });
  });

  it('reads every page in order, preserving search and cancellation on each request', async () => {
    const firstTags = Array.from({ length: 100 }, (_, index) => ({
      ...tag,
      id: String(index),
    }));
    const lastTag = { ...tag, id: 'last' };
    const first = page(firstTags, 101);
    const second = page([lastTag], 101, 2);
    const controller = new AbortController();
    mockGet.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const result = await tagsRepository.list('VIP', controller.signal);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v{version}/tags', {
      query: { Page: 1, PageSize: 100, Search: 'VIP' },
      signal: controller.signal,
    });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v{version}/tags', {
      query: { Page: 2, PageSize: 100, Search: 'VIP' },
      signal: controller.signal,
    });
    expect(result).toEqual({ ok: true, data: [...firstTags, lastTag] });
  });

  it('forwards a failure from the first page unchanged', async () => {
    const failure = {
      ok: false,
      error: { status: 403, code: 'Tenant.ContextMismatch', title: 'Acesso negado.' },
    };
    mockGet.mockResolvedValueOnce(failure);

    const result = await tagsRepository.list();

    expect(result).toBe(failure);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('forwards a later failure unchanged instead of returning a partial catalog', async () => {
    const first = page([tag], 101);
    const failure = {
      ok: false,
      error: { status: 0, code: 'Network.Unreachable', title: 'Sem conexão.' },
    };
    mockGet.mockResolvedValueOnce(first).mockResolvedValueOnce(failure);

    const result = await tagsRepository.list();

    expect(result).toBe(failure);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page even if the reported total is larger', async () => {
    const response = page([], 10);
    mockGet.mockResolvedValueOnce(response);

    const result = await tagsRepository.list();

    expect(result).toEqual({ ok: true, data: [] });
    expect(mockGet).toHaveBeenCalledTimes(1);
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
