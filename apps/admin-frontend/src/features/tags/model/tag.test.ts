import { describe, expect, it } from 'vitest';
import { classifyTagResult } from './tag';
import type { Tag } from './tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const TAG: Tag = { id: 'tag-1', name: 'VIP', color: '#8b5cf6', description: null };

describe('classifyTagResult', () => {
  it('resolves ready with the tag on a successful result', () => {
    expect(classifyTagResult({ ok: true, data: TAG })).toEqual({ status: 'ready', tag: TAG });
  });

  it('resolves not-found for the Tag.NotFound code', () => {
    const problem: ApiProblem = {
      title: "Etiqueta 'tag-1' não foi encontrada.",
      status: 404,
      code: 'Tag.NotFound',
    };

    expect(classifyTagResult({ ok: false, error: problem })).toEqual({ status: 'not-found' });
  });

  it('resolves error for any other failure code', () => {
    const problem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };

    expect(classifyTagResult({ ok: false, error: problem })).toEqual({ status: 'error' });
  });
});
