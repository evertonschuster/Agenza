import { describe, expect, it } from 'vitest';
import { tagFormErrorsFromResult } from './tagForm';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { Tag } from './tag';

const TAG: Tag = { id: 'tag-1', name: 'VIP', color: '#8b5cf6', description: null };

describe('tagFormErrorsFromResult', () => {
  it('returns no errors when there is no result yet', () => {
    expect(tagFormErrorsFromResult<Tag>(undefined)).toEqual({
      fieldErrors: {},
      generalError: undefined,
    });
  });

  it('returns no errors for a successful result', () => {
    expect(tagFormErrorsFromResult({ ok: true, data: TAG })).toEqual({
      fieldErrors: {},
      generalError: undefined,
    });
  });

  it('maps Name/Color/Description field errors by their backend key', () => {
    const problem: ApiProblem = {
      title: 'Dados inválidos.',
      status: 400,
      code: 'Validation.Failed',
      errors: {
        Name: [{ code: 'Required', message: 'O nome é obrigatório.' }],
        Color: [{ code: 'Required', message: 'A cor é obrigatória.' }],
        Description: [{ code: 'MaxLength', message: 'Descrição muito longa.' }],
      },
    };

    expect(tagFormErrorsFromResult({ ok: false, error: problem })).toEqual({
      fieldErrors: {
        name: 'O nome é obrigatório.',
        color: 'A cor é obrigatória.',
        description: 'Descrição muito longa.',
      },
      generalError: undefined,
    });
  });

  it('reads a general (non-field) error from the "" key', () => {
    const problem: ApiProblem = {
      title: "Já existe uma etiqueta chamada 'VIP'.",
      status: 409,
      code: 'Tag.DuplicateName',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'VIP'." }],
      },
    };

    expect(tagFormErrorsFromResult({ ok: false, error: problem })).toEqual({
      fieldErrors: { name: undefined, color: undefined, description: undefined },
      generalError: "Já existe uma etiqueta chamada 'VIP'.",
    });
  });

  it('falls back to extractErrorMessage when the problem has no errors dict at all', () => {
    const problem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };

    expect(tagFormErrorsFromResult({ ok: false, error: problem })).toEqual({
      fieldErrors: { name: undefined, color: undefined, description: undefined },
      generalError: 'Sem conexão com o servidor. Tente novamente.',
    });
  });
});
