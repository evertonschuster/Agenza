import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import {
  TAG_DESCRIPTION_MAX_LENGTH,
  TAG_NAME_MAX_LENGTH,
  toTagFormErrors,
  validateTagForm,
} from './tagForm';

describe('validateTagForm', () => {
  it('returns no errors for a valid name, color and description', () => {
    expect(
      validateTagForm({ name: 'Promoção', color: '#f59e0b', description: 'Desconto' }),
    ).toEqual({});
  });

  it('returns no errors when the optional description is empty', () => {
    expect(validateTagForm({ name: 'Promoção', color: '#f59e0b', description: '' })).toEqual({});
  });

  it('requires a name (spec FR-003)', () => {
    expect(validateTagForm({ name: '', color: '#f59e0b', description: '' }).name).toBe(
      'O nome da etiqueta é obrigatório.',
    );
  });

  it('treats a whitespace-only name as empty', () => {
    expect(validateTagForm({ name: '   ', color: '#f59e0b', description: '' }).name).toBe(
      'O nome da etiqueta é obrigatório.',
    );
  });

  it(`rejects a name over ${TAG_NAME_MAX_LENGTH} characters (spec FR-005)`, () => {
    const name = 'a'.repeat(TAG_NAME_MAX_LENGTH + 1);
    expect(validateTagForm({ name, color: '#f59e0b', description: '' }).name).toBe(
      `O nome da etiqueta deve ter no máximo ${TAG_NAME_MAX_LENGTH} caracteres.`,
    );
  });

  it(`accepts a name of exactly ${TAG_NAME_MAX_LENGTH} characters`, () => {
    const name = 'a'.repeat(TAG_NAME_MAX_LENGTH);
    expect(validateTagForm({ name, color: '#f59e0b', description: '' }).name).toBeUndefined();
  });

  it('requires a color (spec FR-003)', () => {
    expect(validateTagForm({ name: 'Promoção', color: null, description: '' }).color).toBe(
      'A cor da etiqueta é obrigatória.',
    );
  });

  it(`rejects a description over ${TAG_DESCRIPTION_MAX_LENGTH} characters (spec FR-005)`, () => {
    const description = 'a'.repeat(TAG_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateTagForm({ name: 'Promoção', color: '#f59e0b', description }).description).toBe(
      `A descrição da etiqueta deve ter no máximo ${TAG_DESCRIPTION_MAX_LENGTH} caracteres.`,
    );
  });

  it('treats a whitespace-only description as empty, not over the limit (spec Edge Cases)', () => {
    const description = ' '.repeat(TAG_DESCRIPTION_MAX_LENGTH + 20);
    expect(
      validateTagForm({ name: 'Promoção', color: '#f59e0b', description }).description,
    ).toBeUndefined();
  });

  it('reports all invalid fields at once', () => {
    const errors = validateTagForm({ name: '', color: null, description: '' });
    expect(errors.name).toBeDefined();
    expect(errors.color).toBeDefined();
  });
});

describe('toTagFormErrors', () => {
  it('maps PascalCase FluentValidation keys to the matching form field (docs/API.md §4.1)', () => {
    const problem: ApiProblem = {
      status: 400,
      code: 'Validation.Failed',
      title: 'Ocorreram erros de validação.',
      errors: {
        Name: [{ code: 'NotEmptyValidator', message: 'O nome da etiqueta é obrigatório.' }],
        Color: [
          {
            code: 'PredicateValidator',
            message: 'A cor da etiqueta deve ser uma das seguintes: #0d9488.',
          },
        ],
      },
    };

    const { fieldErrors, formError } = toTagFormErrors(problem);

    expect(fieldErrors).toEqual({
      name: 'O nome da etiqueta é obrigatório.',
      color: 'A cor da etiqueta deve ser uma das seguintes: #0d9488.',
    });
    expect(formError).toBeNull();
  });

  it('promotes the collapsed "" key of an application error to a form-level message (spec FR-012)', () => {
    const problem: ApiProblem = {
      status: 409,
      code: 'Tag.DuplicateName',
      title: "Já existe uma etiqueta chamada 'Promoção'.",
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'Promoção'." }],
      },
    };

    const { fieldErrors, formError } = toTagFormErrors(problem);

    expect(fieldErrors).toEqual({});
    expect(formError).toBe("Já existe uma etiqueta chamada 'Promoção'.");
  });

  it('falls back to problem.title when errors is absent (synthetic NETWORK_PROBLEM/SESSION_PROBLEM shape)', () => {
    const problem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };

    const { fieldErrors, formError } = toTagFormErrors(problem);

    expect(fieldErrors).toEqual({});
    expect(formError).toBe('Sem conexão com o servidor. Tente novamente.');
  });

  it('matches a field key case-insensitively', () => {
    const problem: ApiProblem = {
      status: 400,
      title: 'Ocorreram erros de validação.',
      errors: {
        description: [{ message: 'A descrição da etiqueta deve ter no máximo 200 caracteres.' }],
      },
    };

    const { fieldErrors } = toTagFormErrors(problem);

    expect(fieldErrors.description).toBe(
      'A descrição da etiqueta deve ter no máximo 200 caracteres.',
    );
  });
});
