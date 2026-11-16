import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { getRelatedRecordsContent, type RelatedRecordsOptions } from './from-problem';

const options: RelatedRecordsOptions = {
  code: 'Professional.InUse',
  limit: 2,
  groups: [
    { field: 'Appointments', key: 'appointments', title: 'Agendamentos', limitNotice: 'Limite.' },
  ],
  other: { key: 'other', title: 'Outros vínculos', limitNotice: 'Outros limitados.' },
};

describe('getRelatedRecordsContent', () => {
  it('reads a configured code and field, and filters unknown groups by that code', () => {
    const problem = {
      errors: {
        appointments: [
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

    const result = getRelatedRecordsContent(problem, options);
    expect(result.groups[0]?.items).toEqual([{ id: 'a1', name: 'Ana' }]);
    expect(result.groups[1]?.items).toEqual([{ name: 'Outro' }]);
    expect(result.notices).toEqual(['Limite.', 'Outros limitados.']);
  });

  it('handles missing errors and malformed records without inventing names or links', () => {
    expect(getRelatedRecordsContent({}, options).groups[0]?.items).toEqual([]);
    const result = getRelatedRecordsContent(
      {
        errors: { Appointments: [null, {}, { meta: { id: '1' } }, { meta: { name: '  ' } }] },
      } as ApiProblem,
      options,
    );
    expect(result.groups.every((group) => group.items.length === 0)).toBe(true);
    expect(result.notices).toEqual(['Limite.']);
  });
});
