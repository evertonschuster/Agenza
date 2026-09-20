import { describe, expect, it, vi } from 'vitest';
import { tagsRepository } from './tagsRepository';

const { mockDel } = vi.hoisted(() => ({ mockDel: vi.fn() }));

vi.mock('@/shared/api/servicesApi', () => ({
  servicesApi: { del: mockDel },
}));

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
