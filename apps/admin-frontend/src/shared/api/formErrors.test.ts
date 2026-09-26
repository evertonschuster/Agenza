import { describe, expect, it } from 'vitest';
import type { ApiProblem } from './servicesFacade';
import { toFormErrors } from './formErrors';

const FIELDS = ['name', 'color', 'description'] as const;

describe('toFormErrors', () => {
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

    const { fieldErrors, formError } = toFormErrors(problem, FIELDS);

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

    const { fieldErrors, formError } = toFormErrors(problem, FIELDS);

    expect(fieldErrors).toEqual({});
    expect(formError).toBe("Já existe uma etiqueta chamada 'Promoção'.");
  });

  it('falls back to problem.title when errors is absent (synthetic NETWORK_PROBLEM/SESSION_PROBLEM shape)', () => {
    const problem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };

    const { fieldErrors, formError } = toFormErrors(problem, FIELDS);

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

    const { fieldErrors } = toFormErrors(problem, FIELDS);

    expect(fieldErrors.description).toBe(
      'A descrição da etiqueta deve ter no máximo 200 caracteres.',
    );
  });

  it('ignores an error entry with no message', () => {
    const problem: ApiProblem = {
      status: 400,
      title: 'Ocorreram erros de validação.',
      errors: {
        name: [{ code: 'SomeValidator' }],
      },
    };

    const { fieldErrors, formError } = toFormErrors(problem, FIELDS);

    expect(fieldErrors).toEqual({});
    expect(formError).toBe('Ocorreram erros de validação.');
  });
});
