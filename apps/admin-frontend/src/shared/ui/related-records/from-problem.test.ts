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
    expect(result.notices).toEqual([]);
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
    expect(result.notices).toEqual([]);
  });
});
