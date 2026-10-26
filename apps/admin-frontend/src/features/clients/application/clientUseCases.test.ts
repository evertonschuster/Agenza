import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Topic } from '@/shared/pubsub/createTopic';
import type { Client, ClientInput } from '../model/client';
import { clientCreated, clientDeleted, clientUpdated } from '../model/clientEvents';
import { createClient, deleteClient, updateClient } from './clientUseCases';

const { mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../api/clientsRepository', () => ({
  clientsRepository: { create: mockCreate, update: mockUpdate, delete: mockDelete },
}));

const INPUT: ClientInput = {
  fullName: 'Ana Souza',
  birthDate: null,
  phone: null,
  email: 'ana@example.com',
  cpf: null,
  administrativeNotes: null,
  guardians: [],
  referenceContacts: [],
};

const CLIENT: Client = {
  ...INPUT,
  id: 'c1',
  status: 'active',
  guardians: [],
  referenceContacts: [],
};

const CONFLICT = {
  ok: false,
  error: { status: 409, code: 'Client.DuplicateEmail', title: 'E-mail em uso.' },
};

const unsubscribers: (() => void)[] = [];

function listen<T>(topic: Topic<T>) {
  const listener = vi.fn();
  unsubscribers.push(topic.subscribe(listener));
  return listener;
}

describe('client use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  });

  describe('createClient', () => {
    it('creates through the repository and announces the creation, not an update', async () => {
      mockCreate.mockResolvedValue({ ok: true, data: CLIENT });
      const created = listen(clientCreated);
      const updated = listen(clientUpdated);

      const result = await createClient(INPUT);

      expect(mockCreate).toHaveBeenCalledWith(INPUT);
      expect(result).toEqual({ ok: true, data: CLIENT });
      expect(created).toHaveBeenCalledWith({ id: 'c1' });
      expect(updated).not.toHaveBeenCalled();
    });

    it('returns a failure as a value and announces nothing', async () => {
      mockCreate.mockResolvedValue(CONFLICT);
      const created = listen(clientCreated);

      const result = await createClient(INPUT);

      expect(result).toEqual(CONFLICT);
      expect(created).not.toHaveBeenCalled();
    });
  });

  describe('updateClient', () => {
    it('updates the given id through the repository and announces the update, not a creation', async () => {
      mockUpdate.mockResolvedValue({ ok: true, data: CLIENT });
      const updated = listen(clientUpdated);
      const created = listen(clientCreated);

      const result = await updateClient('c1', INPUT);

      expect(mockUpdate).toHaveBeenCalledWith('c1', INPUT);
      expect(result).toEqual({ ok: true, data: CLIENT });
      expect(updated).toHaveBeenCalledWith({ id: 'c1' });
      expect(created).not.toHaveBeenCalled();
    });

    it('returns a failure as a value and announces nothing', async () => {
      mockUpdate.mockResolvedValue(CONFLICT);
      const updated = listen(clientUpdated);

      const result = await updateClient('c1', INPUT);

      expect(result).toEqual(CONFLICT);
      expect(updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteClient', () => {
    it('deletes the given id through the repository and announces the deletion', async () => {
      mockDelete.mockResolvedValue({ ok: true, data: undefined });
      const deleted = listen(clientDeleted);

      const result = await deleteClient('c1');

      expect(mockDelete).toHaveBeenCalledWith('c1');
      expect(result).toEqual({ ok: true, data: undefined });
      expect(deleted).toHaveBeenCalledWith({ id: 'c1' });
    });

    it('returns a failure as a value and announces nothing', async () => {
      const blocked = {
        ok: false,
        error: { status: 409, code: 'Client.HasAppointments', title: 'Tem agendamentos.' },
      };
      mockDelete.mockResolvedValue(blocked);
      const deleted = listen(clientDeleted);

      const result = await deleteClient('c1');

      expect(result).toEqual(blocked);
      expect(deleted).not.toHaveBeenCalled();
    });
  });
});
