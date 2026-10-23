import { describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import type { ClientInput } from '../model/client';
import { clientsRepository, type ClientListQuery } from './clientsRepository';

const { mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('@/shared/api/servicesApi', () => ({
  servicesApi: { get: mockGet, post: mockPost, put: mockPut },
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
  const FIRST_PAGE_OF_ACTIVE: ClientListQuery = {
    search: '',
    status: 'active',
    page: 1,
    pageSize: 20,
  };

  it('always asks for a page, a size and a situation, so the screen never depends on the backend defaults', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list(FIRST_PAGE_OF_ACTIVE);

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/clients', {
      query: { Page: 1, PageSize: 20, Status: 'active' },
      signal: undefined,
    });
  });

  it('sends the page, the size, the situation and the search term under the names the API reads', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list({ search: 'maria', status: 'inactive', page: 3, pageSize: 50 });

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/clients', {
      query: { Page: 3, PageSize: 50, Status: 'inactive', Search: 'maria' },
      signal: undefined,
    });
  });

  it('leaves Search out, instead of sending it empty, without a search term', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list(FIRST_PAGE_OF_ACTIVE);

    const [, options] = mockGet.mock.calls.at(-1) as [string, { query: object }];
    expect(options.query).not.toHaveProperty('Search');
  });

  it('sends "all" as it is, instead of leaving Status out, to list every situation', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });

    await clientsRepository.list({ search: '', status: 'all', page: 2, pageSize: 10 });

    const [, options] = mockGet.mock.calls.at(-1) as [string, { query: object }];
    expect(options.query).toHaveProperty('Status', 'all');
  });

  it('hands the abort signal over to the request', async () => {
    mockGet.mockResolvedValue({ ok: true, data: { items: [], totalCount: 0 } });
    const controller = new AbortController();

    await clientsRepository.list(
      { search: 'maria', status: 'active', page: 1, pageSize: 20 },
      controller.signal,
    );

    const [, options] = mockGet.mock.calls.at(-1) as [string, { signal: AbortSignal }];
    expect(options.signal).toBe(controller.signal);
  });

  it('forwards the whole page verbatim, with the items and the paging data', async () => {
    const page = { items: [LIST_ITEM], totalCount: 21, page: 1, pageSize: 20 };
    mockGet.mockResolvedValue({ ok: true, data: page });

    const result = await clientsRepository.list(FIRST_PAGE_OF_ACTIVE);

    expect(result).toEqual({ ok: true, data: page });
  });

  it('forwards a failed result verbatim, without throwing (e.g. a search past the limit)', async () => {
    const error = {
      status: 400,
      code: 'Validation.Failed',
      title: 'A busca deve ter no máximo 254 caracteres.',
    };
    mockGet.mockResolvedValue({ ok: false, error });

    const result = await clientsRepository.list({
      search: 'x',
      status: 'active',
      page: 1,
      pageSize: 20,
    });

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

const RESPONSE = { id: 'abc', ...INPUT, birthDate: '2015-03-10', status: 'active' };
const CLIENT = { ...RESPONSE, birthDate: utcDate(2015, 3, 10) };

describe('clientsRepository.create', () => {
  it('posts the whole person with its contacts to POST /clients and answers the saved person', async () => {
    mockPost.mockResolvedValue({ ok: true, data: RESPONSE });

    const result = await clientsRepository.create(INPUT);

    expect(mockPost).toHaveBeenCalledWith('/api/v{version}/clients', { body: INPUT });
    expect(result).toEqual({ ok: true, data: CLIENT });
  });

  it('hands the birth date over as the Date itself, which JSON writes as an instant at midnight UTC', async () => {
    mockPost.mockResolvedValue({ ok: true, data: RESPONSE });

    await clientsRepository.create(INPUT);

    const [, options] = mockPost.mock.calls.at(-1) as [string, { body: unknown }];
    expect(JSON.parse(JSON.stringify(options.body))).toMatchObject({
      birthDate: '2015-03-10T00:00:00.000Z',
    });
  });

  it('never sends a tenant, only what the person typed', async () => {
    mockPost.mockResolvedValue({ ok: true, data: RESPONSE });

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

const NOT_FOUND = { status: 404, code: 'Client.NotFound', title: 'A pessoa não foi encontrada.' };

describe('clientsRepository.get', () => {
  it('reads one person by id from GET /clients/{id}, handing the abort signal over', async () => {
    mockGet.mockResolvedValue({ ok: true, data: RESPONSE });
    const controller = new AbortController();

    const result = await clientsRepository.get('abc', controller.signal);

    expect(mockGet).toHaveBeenCalledWith('/api/v{version}/clients/{id}', {
      path: { id: 'abc' },
      signal: controller.signal,
    });
    expect(result).toEqual({ ok: true, data: CLIENT });
  });

  it('reads the yyyy-MM-dd birth date as a Date at midnight UTC, and no birth date as null', async () => {
    mockGet.mockResolvedValueOnce({ ok: true, data: { ...RESPONSE, birthDate: '1990-12-31' } });
    mockGet.mockResolvedValueOnce({ ok: true, data: { ...RESPONSE, birthDate: null } });

    const withDate = await clientsRepository.get('abc');
    const withoutDate = await clientsRepository.get('abc');

    expect(withDate.ok && withDate.data.birthDate).toEqual(utcDate(1990, 12, 31));
    expect(withoutDate.ok && withoutDate.data.birthDate).toBeNull();
  });

  it('forwards a failed result verbatim, without throwing (e.g. a person that no longer exists)', async () => {
    mockGet.mockResolvedValue({ ok: false, error: NOT_FOUND });

    expect(await clientsRepository.get('abc')).toEqual({ ok: false, error: NOT_FOUND });
  });
});

describe('clientsRepository.update', () => {
  it('puts the whole person with its contacts to PUT /clients/{id}, naming the client in the body too', async () => {
    mockPut.mockResolvedValue({ ok: true, data: RESPONSE });

    const result = await clientsRepository.update('abc', INPUT);

    expect(mockPut).toHaveBeenCalledWith('/api/v{version}/clients/{id}', {
      path: { id: 'abc' },
      body: { clientId: 'abc', ...INPUT },
    });
    expect(result).toEqual({ ok: true, data: CLIENT });
  });

  it('forwards a failed result verbatim, without throwing (e.g. duplicate e-mail)', async () => {
    const error = { status: 409, code: 'Client.DuplicateEmail', title: 'E-mail em uso.' };
    mockPut.mockResolvedValue({ ok: false, error });

    expect(await clientsRepository.update('abc', INPUT)).toEqual({ ok: false, error });
  });
});

describe('clientsRepository.deactivate and reactivate', () => {
  it('posts to the deactivate and reactivate routes of that person, with no body, and answers the person', async () => {
    mockPost.mockResolvedValue({ ok: true, data: RESPONSE });

    expect(await clientsRepository.deactivate('abc')).toEqual({ ok: true, data: CLIENT });
    expect(await clientsRepository.reactivate('abc')).toEqual({ ok: true, data: CLIENT });

    expect(mockPost).toHaveBeenCalledWith('/api/v{version}/clients/{id}/deactivate', {
      path: { id: 'abc' },
    });
    expect(mockPost).toHaveBeenCalledWith('/api/v{version}/clients/{id}/reactivate', {
      path: { id: 'abc' },
    });
  });

  it('forwards a failed result verbatim, without throwing (e.g. a CPF taken while inactive)', async () => {
    const error = { status: 409, code: 'Client.DuplicateCpf', title: 'CPF em uso.' };
    mockPost.mockResolvedValue({ ok: false, error });

    expect(await clientsRepository.reactivate('abc')).toEqual({ ok: false, error });
  });
});
