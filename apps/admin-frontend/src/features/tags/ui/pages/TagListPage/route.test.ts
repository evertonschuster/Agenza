import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import { loader } from './route';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

function requestWithUrl(url: string): Request {
  return { url } as unknown as Request;
}

describe('tagListLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the tag list and an empty query when the URL has no search term', async () => {
    const tags = [{ id: '1', name: 'VIP', color: '#8b5cf6', description: null }];
    mockList.mockResolvedValue({ ok: true, data: tags });

    await expect(
      loader({ request: requestWithUrl('http://localhost/tags') } as LoaderFunctionArgs),
    ).resolves.toEqual({ status: 'ready', tags, query: '' });
    expect(mockList).toHaveBeenCalledWith(undefined);
  });

  it('passes the "q" URL param to the repository, so search filters on the backend (not the frontend)', async () => {
    const tags = [{ id: '1', name: 'VIP', color: '#8b5cf6', description: null }];
    mockList.mockResolvedValue({ ok: true, data: tags });

    await expect(
      loader({ request: requestWithUrl('http://localhost/tags?q=vip') } as LoaderFunctionArgs),
    ).resolves.toEqual({ status: 'ready', tags, query: 'vip' });
    expect(mockList).toHaveBeenCalledWith('vip');
  });

  it('resolves with an error status for a non-auth failure, instead of throwing (keeps the list screen up)', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: { title: 'O servidor está instável.', code: 'Server.Unavailable' },
    });

    await expect(
      loader({ request: requestWithUrl('http://localhost/tags') } as LoaderFunctionArgs),
    ).resolves.toEqual({ status: 'error', query: '' });
  });

  it.each([['Session.Missing'], ['Authorization.Unauthorized']] as const)(
    'throws a redirect Response to /login for code %s, instead of resolving',
    async (code) => {
      mockList.mockResolvedValue({ ok: false, error: { code, title: 'Sua sessão expirou.' } });

      const thrown: unknown = await loader({
        request: requestWithUrl('http://localhost/tags'),
      } as LoaderFunctionArgs).catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get('Location')).toBe('/login');
    },
  );
});
