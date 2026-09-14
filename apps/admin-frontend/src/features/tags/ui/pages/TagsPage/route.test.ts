import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { tagsLoader, tagsAction } from './route';

const { mockList, mockCreate, mockUpdate, mockRemove } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, create: mockCreate, update: mockUpdate, remove: mockRemove },
}));

function requestWithFormData(fields: Record<string, string>): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return { formData: () => Promise.resolve(formData) } as unknown as Request;
}

function requestWithUrl(url: string): Request {
  return { url } as unknown as Request;
}

describe('tagsLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the tag list and an empty query when the URL has no search term', async () => {
    const tags = [{ id: '1', name: 'VIP', color: '#8b5cf6', description: null }];
    mockList.mockResolvedValue({ ok: true, data: tags });

    await expect(
      tagsLoader({ request: requestWithUrl('http://localhost/tags') } as LoaderFunctionArgs),
    ).resolves.toEqual({ tags, query: '' });
    expect(mockList).toHaveBeenCalledWith(undefined);
  });

  it('passes the "q" URL param to the repository, so search filters on the backend (not the frontend)', async () => {
    const tags = [{ id: '1', name: 'VIP', color: '#8b5cf6', description: null }];
    mockList.mockResolvedValue({ ok: true, data: tags });

    await expect(
      tagsLoader({ request: requestWithUrl('http://localhost/tags?q=vip') } as LoaderFunctionArgs),
    ).resolves.toEqual({ tags, query: 'vip' });
    expect(mockList).toHaveBeenCalledWith('vip');
  });

  it('throws when the list fetch fails, for the route error boundary to catch', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: { title: 'O servidor está instável.', code: 'Server.Unavailable' },
    });

    await expect(
      tagsLoader({ request: requestWithUrl('http://localhost/tags') } as LoaderFunctionArgs),
    ).rejects.toThrow();
  });
});

describe('tagsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a tag from the submitted fields, sending null for an empty description', async () => {
    mockCreate.mockResolvedValue({ ok: true, data: {} });
    const request = requestWithFormData({
      intent: 'create',
      name: 'Promoção',
      color: '#f59e0b',
      description: '',
    });

    await tagsAction({ request } as ActionFunctionArgs);

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Promoção',
      color: '#f59e0b',
      description: null,
    });
  });

  it('updates a tag by id with the submitted fields', async () => {
    mockUpdate.mockResolvedValue({ ok: true, data: {} });
    const request = requestWithFormData({
      intent: 'update',
      id: 'tag-1',
      name: 'VIP',
      color: '#8b5cf6',
      description: 'Clientes premium',
    });

    await tagsAction({ request } as ActionFunctionArgs);

    expect(mockUpdate).toHaveBeenCalledWith('tag-1', {
      name: 'VIP',
      color: '#8b5cf6',
      description: 'Clientes premium',
    });
  });

  it('deletes a tag by id', async () => {
    mockRemove.mockResolvedValue({ ok: true, data: undefined });
    const request = requestWithFormData({ intent: 'delete', id: 'tag-1' });

    await tagsAction({ request } as ActionFunctionArgs);

    expect(mockRemove).toHaveBeenCalledWith('tag-1');
  });

  it('throws a Response for an unrecognized intent', async () => {
    const request = requestWithFormData({ intent: 'bogus' });

    await expect(tagsAction({ request } as ActionFunctionArgs)).rejects.toBeInstanceOf(Response);
  });
});
