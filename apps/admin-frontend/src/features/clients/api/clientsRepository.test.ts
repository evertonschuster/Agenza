import { describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import type { ClientInput } from '../model/client';
import { clientsRepository } from './clientsRepository';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('@/shared/api/servicesApi', () => ({
  servicesApi: { post: mockPost },
}));

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
