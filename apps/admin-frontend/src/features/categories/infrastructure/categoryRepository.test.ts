import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));
vi.mock('@/app/servicesApi', () => ({
  servicesApi: { get: getMock, post: postMock, put: putMock },
}));

import { ok } from '@/shared/result';
import { categoryRepository } from './categoryRepository';

const DTO = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };

describe('categoryRepository', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  it('list() maps the search filter and forwards the facade result verbatim', async () => {
    const result = ok([DTO]);
    getMock.mockResolvedValue(result);

    expect(await categoryRepository.list({ search: 'cab' })).toBe(result);
    expect(getMock).toHaveBeenCalledWith('/api/v{version}/categories', {
      query: { Search: 'cab' },
    });
  });

  it('list() with no filter sends an empty query', async () => {
    getMock.mockResolvedValue(ok([]));

    await categoryRepository.list();

    expect(getMock).toHaveBeenCalledWith('/api/v{version}/categories', { query: {} });
  });

  it('create() posts the name', async () => {
    postMock.mockResolvedValue(ok(DTO));

    await categoryRepository.create('Cabelo');

    expect(postMock).toHaveBeenCalledWith('/api/v{version}/categories', {
      body: { name: 'Cabelo' },
    });
  });

  it('update() puts the id in the path and the command in the body', async () => {
    putMock.mockResolvedValue(ok(DTO));

    await categoryRepository.update(DTO.id, 'Barba');

    expect(putMock).toHaveBeenCalledWith('/api/v{version}/categories/{id}', {
      path: { id: DTO.id },
      body: { categoryId: DTO.id, name: 'Barba' },
    });
  });
});
