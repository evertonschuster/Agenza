import { describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import type { ClientInput } from '../model/client';
import { clientsRepository } from './clientsRepository';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/shared/api/servicesApi', () => ({
  servicesApi: { get: mockGet, post: mockPost },
}));

const LIST_ITEM = {
  id: 'abc',
  fullName: 'Maria Souza',
  birthDate: null,
  phone: null,
  email: 'maria@example.com',
  cpf: '52998224725',
  status: 'active',
};

describe('clientsRepository.list', () => {
  it('sends the search term as Search and nothing else, leaving the backend defaults (active, first page) in charge', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list('maria');

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/clients', {
      query: { Search: 'maria' },
      signal: undefined,
    });
  });

  it('sends no query at all without a search term', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list();

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/clients', {
      query: undefined,
      signal: undefined,
    });
  });

  it('hands the abort signal over to the request', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });
    const controller = new AbortController();

    await clientsRepository.list('maria', controller.signal);

    const [, options] = mockGet.mock.calls.at(-1) as [string, { signal: AbortSignal }];
    expect(options.signal).toBe(controller.signal);
  });

  it('keeps the items as they came and turns the wire total, which may be a string, into a number', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      data: { items: [LIST_ITEM], totalCount: '21', page: 1, pageSize: 20 },
    });

    const result = await clientsRepository.list();

    expect(result).toEqual({ ok: true, data: { items: [LIST_ITEM], totalCount: 21 } });
  });

  it('forwards a failed result verbatim, without throwing (e.g. a search past the limit)', async () => {
    const error = {
      status: 400,
      code: 'Validation.Failed',
      title: 'A busca deve ter no máximo 254 caracteres.',
    };
    mockGet.mockResolvedValue({ ok: false, error });

    const result = await clientsRepository.list('x');

    expect(result).toEqual({ ok: false, error });
  });
});

const INPUT: ClientInput = {
  fullName: 'Maria Souza',
  birthDate: utcDate(2015, 3, 10),
  phone: null,
  email: 'maria@example.com',
  cpf: '52998224725',
  administrativeNotes: null,
  guardians: [{ name: 'Ana Souza', relationship: 'Mãe', phone: null, cpf: null }],
  referenceContacts: [
    { name: 'Carlos Lima', relationship: 'Tio', phone: null, purposes: ['emergency'] },
  ],
};

describe('clientsRepository.create', () => {
  it('posts the whole person with its contacts to POST /clients and forwards the result verbatim', async () => {
    const client = { id: 'abc', ...INPUT, status: 'active' };
    mockPost.mockResolvedValue({ ok: true, data: client });

    const result = await clientsRepository.create(INPUT);

    expect(mockPost).toHaveBeenCalledWith('/api/v{version}/clients', { body: INPUT });
    expect(result).toEqual({ ok: true, data: client });
  });

  it('hands the birth date over as the Date itself, which JSON writes as an instant at midnight UTC', async () => {
    mockPost.mockResolvedValue({ ok: true, data: {} });

    await clientsRepository.create(INPUT);

    const [, options] = mockPost.mock.calls.at(-1) as [string, { body: unknown }];
    expect(JSON.parse(JSON.stringify(options.body))).toMatchObject({
      birthDate: '2015-03-10T00:00:00.000Z',
    });
  });

  it('never sends a tenant, only what the person typed', async () => {
    mockPost.mockResolvedValue({ ok: true, data: {} });

    await clientsRepository.create(INPUT);

    const [, options] = mockPost.mock.calls.at(-1) as [string, { body: Record<string, unknown> }];
    expect(Object.keys(options.body).some((key) => key.toLowerCase().includes('tenant'))).toBe(
      false,
    );
  });

  it('forwards a failed result verbatim, without throwing (e.g. duplicate CPF)', async () => {
    const error = {
      status: 409,
      code: 'Client.DuplicateCpf',
      title: 'Já existe uma pessoa cadastrada com este CPF.',
    };
    mockPost.mockResolvedValue({ ok: false, error });

    const result = await clientsRepository.create(INPUT);

    expect(result).toEqual({ ok: false, error });
  });
});
