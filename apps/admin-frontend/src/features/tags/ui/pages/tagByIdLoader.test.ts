import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import { tagByIdLoader } from './tagByIdLoader';
import type { Tag } from '../../model/tag';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('../../api/tagsRepository', () => ({
  tagsRepository: {
    list: vi.fn(),
    get: mockGet,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const TAG: Tag = { id: 'tag-1', name: 'VIP', color: '#8b5cf6', description: null };

function args(id: string | undefined): LoaderFunctionArgs {
  return { params: { id } } as unknown as LoaderFunctionArgs;
}

describe('tagByIdLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves ready with the tag fetched by id', async () => {
    mockGet.mockResolvedValue({ ok: true, data: TAG });

    await expect(tagByIdLoader(args('tag-1'))).resolves.toEqual({ status: 'ready', tag: TAG });
    expect(mockGet).toHaveBeenCalledWith('tag-1');
  });

  it('resolves not-found for the Tag.NotFound code', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'Tag.NotFound', title: "Etiqueta 'tag-1' não foi encontrada." },
    });

    await expect(tagByIdLoader(args('tag-1'))).resolves.toEqual({ status: 'not-found' });
  });

  it('resolves not-found without calling the backend when the route has no id', async () => {
    await expect(tagByIdLoader(args(undefined))).resolves.toEqual({ status: 'not-found' });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('resolves error for a non-auth, non-not-found failure, instead of throwing', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'Network.Unreachable', title: 'Sem conexão com o servidor. Tente novamente.' },
    });

    await expect(tagByIdLoader(args('tag-1'))).resolves.toEqual({ status: 'error' });
  });

  it.each([['Session.Missing'], ['Authorization.Unauthorized']] as const)(
    'throws a redirect Response to /login for code %s, instead of resolving',
    async (code) => {
      mockGet.mockResolvedValue({ ok: false, error: { code, title: 'Sua sessão expirou.' } });

      const thrown: unknown = await tagByIdLoader(args('tag-1')).catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get('Location')).toBe('/login');
    },
  );
});
