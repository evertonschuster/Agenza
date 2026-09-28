import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Topic } from '@/shared/pubsub/createTopic';
import { tagDeleted, tagSaved } from '../model/tagEvents';
import { createTag, deleteTag, updateTag } from './tagUseCases';

const { mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../api/tagsRepository', () => ({
  tagsRepository: { create: mockCreate, update: mockUpdate, delete: mockDelete },
}));

const INPUT = { name: 'Promoção', color: '#f59e0b', description: null };
const TAG = { id: '1', ...INPUT };
const CONFLICT = {
  ok: false,
  error: {
    status: 409,
    code: 'Tag.DuplicateName',
    title: "Já existe uma etiqueta chamada 'Promoção'.",
  },
};

const unsubscribers: (() => void)[] = [];

function listen<T>(topic: Topic<T>) {
  const listener = vi.fn();
  unsubscribers.push(topic.subscribe(listener));
  return listener;
}

describe('tag use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  });

  describe('createTag', () => {
    it('creates through the repository and announces the saved tag', async () => {
      mockCreate.mockResolvedValue({ ok: true, data: TAG });
      const saved = listen(tagSaved);

      const result = await createTag(INPUT);

      expect(mockCreate).toHaveBeenCalledWith(INPUT);
      expect(result).toEqual({ ok: true, data: TAG });
      expect(saved).toHaveBeenCalledWith({ id: '1' });
    });

    it('returns a failure as a value and announces nothing', async () => {
      mockCreate.mockResolvedValue(CONFLICT);
      const saved = listen(tagSaved);

      const result = await createTag(INPUT);

      expect(result).toEqual(CONFLICT);
      expect(saved).not.toHaveBeenCalled();
    });
  });

  describe('updateTag', () => {
    it('updates the given id through the repository and announces the saved tag', async () => {
      mockUpdate.mockResolvedValue({ ok: true, data: TAG });
      const saved = listen(tagSaved);

      const result = await updateTag('1', INPUT);

      expect(mockUpdate).toHaveBeenCalledWith('1', INPUT);
      expect(result).toEqual({ ok: true, data: TAG });
      expect(saved).toHaveBeenCalledWith({ id: '1' });
    });

    it('returns a failure as a value and announces nothing', async () => {
      mockUpdate.mockResolvedValue(CONFLICT);
      const saved = listen(tagSaved);

      const result = await updateTag('1', INPUT);

      expect(result).toEqual(CONFLICT);
      expect(saved).not.toHaveBeenCalled();
    });
  });

  describe('deleteTag', () => {
    it('deletes the given id through the repository and announces the deletion', async () => {
      mockDelete.mockResolvedValue({ ok: true, data: undefined });
      const deleted = listen(tagDeleted);

      const result = await deleteTag('1');

      expect(mockDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ ok: true, data: undefined });
      expect(deleted).toHaveBeenCalledWith({ id: '1' });
    });

    it('returns a failure as a value and announces nothing', async () => {
      const inUse = { ok: false, error: { status: 409, code: 'Tag.InUse', title: 'Em uso.' } };
      mockDelete.mockResolvedValue(inUse);
      const deleted = listen(tagDeleted);

      const result = await deleteTag('1');

      expect(result).toEqual(inUse);
      expect(deleted).not.toHaveBeenCalled();
    });
  });
});
