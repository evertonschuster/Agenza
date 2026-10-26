import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientDeleted } from '../model/clientEvents';
import { deleteClient } from './clientUseCases';

const { mockDelete } = vi.hoisted(() => ({ mockDelete: vi.fn() }));

vi.mock('../api/clientsRepository', () => ({
  clientsRepository: { delete: mockDelete },
}));

const unsubscribers: (() => void)[] = [];

function listenToDeletions() {
  const listener = vi.fn();
  unsubscribers.push(clientDeleted.subscribe(listener));
  return listener;
}

describe('client use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  });

  describe('deleteClient', () => {
    it('deletes the given id through the repository and announces the deletion', async () => {
      mockDelete.mockResolvedValue({ ok: true, data: undefined });
      const deleted = listenToDeletions();

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
      const deleted = listenToDeletions();

      const result = await deleteClient('c1');

      expect(result).toEqual(blocked);
      expect(deleted).not.toHaveBeenCalled();
    });
  });
});
