import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { getRelatedRecordsContent } from './from-problem';

describe('getRelatedRecordsContent', () => {
  it('uses the problem code for unknown groups and filters unrelated or incomplete records', () => {
    const problem = {
      code: 'Professional.InUse',
      errors: {
        clients: [
          { meta: { id: ' a1 ', name: ' Ana ' } },
          { code: 'Other.Error', meta: { name: 'Ignorar' } },
        ],
        FutureModule: [
          { code: 'Professional.InUse', meta: { id: '..', name: ' Outro ' } },
          { code: 'Tag.InUse', meta: { name: 'Não exibir' } },
          { meta: { name: 'Sem código' } },
        ],
      },
    } as ApiProblem;
    const result = getRelatedRecordsContent(problem);
    expect(result.groups[0]?.items).toEqual([{ id: 'a1', name: 'Ana' }]);
    expect(result.groups[2]?.items).toEqual([{ name: 'Outro' }]);
  });

  it('handles absent errors, malformed records and unknown groups with no problem code', () => {
    expect(getRelatedRecordsContent({}).groups[0]?.items).toEqual([]);
    const result = getRelatedRecordsContent({
      errors: {
        Clients: [null, {}, { meta: { id: '1' } }, { meta: { name: '  ' } }],
        FutureModule: [{ code: '', meta: { name: 'Não exibir' } }],
      },
    } as ApiProblem);
    expect(result.groups.every((group) => group.items.length === 0)).toBe(true);
  });

  it('ignores invalid entries in known and unknown groups', () => {
    const entries = Array.from({ length: 10 }, () => ({ code: 'Tag.InUse', meta: {} }));
    const result = getRelatedRecordsContent({
      code: 'Tag.InUse',
      errors: { Clients: entries, Procedures: entries },
    });

    expect(result.groups.every((group) => group.items.length === 0)).toBe(true);
  });

  it('keeps new types visible as other links until they have a known presentation', () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      code: 'Category.InUse',
      meta: { id: String(index), name: `Procedimento ${index}`, url: 'https://example.com' },
    }));
    const result = getRelatedRecordsContent({
      code: 'Category.InUse',
      errors: { Procedures: entries },
    });

    expect(result.groups[2]?.items).toHaveLength(10);
    expect(result.groups[2]?.getEditPath).toBeUndefined();
  });

  it.each([9, 10, 11])('uses all received service records when there are %i', (count) => {
    const entries = Array.from({ length: count }, (_, index) => ({
      code: 'Tag.InUse',
      meta: { id: String(index), name: `Serviço ${index}` },
    }));
    const result = getRelatedRecordsContent({
      code: 'Tag.InUse',
      errors: { Services: entries },
    });

    expect(result.groups[1]?.items).toHaveLength(count);
  });

  it('reads the first matching field without repeating differently cased duplicates', () => {
    const result = getRelatedRecordsContent({
      code: 'Tag.InUse',
      errors: {
        Clients: [{ meta: { name: 'Primeiro' } }],
        clients: [{ meta: { name: 'Segundo' } }],
      },
    });

    expect(result.groups[0]?.items).toEqual([{ name: 'Primeiro' }]);
    expect(result.groups[2]?.items).toEqual([]);
  });
});
