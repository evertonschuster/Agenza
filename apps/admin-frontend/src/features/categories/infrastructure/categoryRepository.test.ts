import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('@/app/servicesApi', () => ({ servicesApi: { get: getMock } }));

import { ok, fail } from '@/shared/result';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { categoryRepository } from './categoryRepository';

const DTO = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };
const problem = (status: number, code: string): ApiProblem => ({ status, code, title: code });

describe('categoryRepository', () => {
  beforeEach(() => getMock.mockReset());

  it('list() forwards the search filter and maps the payload to domain categories', async () => {
    getMock.mockResolvedValue(ok([DTO]));

    const result = await categoryRepository.list({ search: 'cab' });

    expect(getMock).toHaveBeenCalledWith('/api/v{version}/categories', {
      query: { Search: 'cab' },
    });
    expect(result).toEqual({ ok: true, data: [{ id: DTO.id, name: 'Cabelo' }] });
  });

  it('list() with no filter sends an empty query', async () => {
    getMock.mockResolvedValue(ok([]));

    await categoryRepository.list();

    expect(getMock).toHaveBeenCalledWith('/api/v{version}/categories', { query: {} });
  });

  it('list() passes a failure straight through to the caller', async () => {
    const f = fail(problem(0, 'Network.Unreachable'));
    getMock.mockResolvedValue(f);

    expect(await categoryRepository.list()).toBe(f);
  });

  it('getById() targets the id route and maps the payload', async () => {
    getMock.mockResolvedValue(ok(DTO));

    const result = await categoryRepository.getById(DTO.id);

    expect(getMock).toHaveBeenCalledWith('/api/v{version}/categories/{id}', {
      path: { id: DTO.id },
    });
    expect(result).toEqual({ ok: true, data: { id: DTO.id, name: 'Cabelo' } });
  });

  it('getById() surfaces a not_found failure instead of returning null', async () => {
    const f = fail(problem(404, 'Category.NotFound'));
    getMock.mockResolvedValue(f);

    expect(await categoryRepository.getById('missing')).toBe(f);
  });
});
