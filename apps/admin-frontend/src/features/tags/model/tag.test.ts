import { describe, expect, it } from 'vitest';
import { findTagById, type Tag } from './tag';

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

describe('findTagById', () => {
  it('returns the tag whose id matches', () => {
    expect(findTagById(TAGS, '2')).toEqual(TAGS[1]);
  });

  it('returns undefined when no tag matches', () => {
    expect(findTagById(TAGS, 'missing')).toBeUndefined();
  });
});
