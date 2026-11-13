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
      name: { code: 'NotEmptyValidator', message: 'O nome da etiqueta é obrigatório.' },
      color: {
        code: 'PredicateValidator',
        message: 'A cor da etiqueta deve ser uma das seguintes: #0d9488.',
      },
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

    expect(fieldErrors.description?.message).toBe(
      'A descrição da etiqueta deve ter no máximo 200 caracteres.',
    );
  });

  it('maps an indexed FluentValidation key to the matching nested field path', () => {
    const problem: ApiProblem = {
      status: 400,
      title: 'Ocorreram erros de validação.',
      errors: {
        'Guardians[1].Name': [{ message: 'O nome do responsável é obrigatório.' }],
        'ReferenceContacts[0].Purposes': [{ message: 'Informe ao menos uma finalidade.' }],
        'Guardians[7].Name': [{ message: 'Um índice que o formulário não tem.' }],
      },
    };

    const { fieldErrors, formError } = toFormErrors(problem, [
      'guardians.0.name',
      'guardians.1.name',
      'referenceContacts.0.purposes',
    ] as const);

    expect(fieldErrors).toEqual({
      'guardians.1.name': { message: 'O nome do responsável é obrigatório.' },
      'referenceContacts.0.purposes': { message: 'Informe ao menos uma finalidade.' },
    });
    expect(formError).toBe('Um índice que o formulário não tem.');
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

  describe('aliases', () => {
    const PICKER_FIELDS = [
      'category',
      'tags',
      'tags.0',
      'tags.0.id',
      'guardians',
      'guardians.0',
      'guardians.0.tagIds',
      'tagIdsArchived',
    ] as const;
    const ALIASES = { categoryId: 'category', tagIds: 'tags' } as const;

    it('keeps on the form field the first error of the aliased command field and of its items', () => {
      const problem: ApiProblem = {
        status: 400,
        errors: {
          TagIds: [{ code: 'Client.DuplicateTag', message: 'Etiqueta repetida.' }],
          'TagIds[0]': [{ code: 'Client.TagIdRequired', message: 'Informe a etiqueta.' }],
          'TagIds[0].Value': [{ code: 'Other', message: 'Outro erro da etiqueta.' }],
        },
      };

      const { fieldErrors, formError } = toFormErrors(problem, PICKER_FIELDS, ALIASES);

      expect(fieldErrors).toEqual({
        tags: { code: 'Client.DuplicateTag', message: 'Etiqueta repetida.' },
      });
      expect(formError).toBeNull();
    });

    it('takes an item error to the form field when the server sends none on the list', () => {
      const problem: ApiProblem = {
        status: 400,
        errors: {
          'TagIds[0]': [{ code: 'Client.TagIdRequired', message: 'Informe a etiqueta.' }],
        },
      };

      const { fieldErrors } = toFormErrors(problem, PICKER_FIELDS, ALIASES);

      expect(fieldErrors).toEqual({
        tags: { code: 'Client.TagIdRequired', message: 'Informe a etiqueta.' },
      });
    });

    it('takes each alias to its own form field, ignoring case', () => {
      const problem: ApiProblem = {
        status: 400,
        errors: {
          tagids: [{ code: 'Tag.NotFound', message: 'Etiqueta não encontrada.' }],
          CategoryId: [{ code: 'Category.NotFound', message: 'Categoria não encontrada.' }],
        },
      };

      const { fieldErrors } = toFormErrors(problem, PICKER_FIELDS, ALIASES);

      expect(fieldErrors).toEqual({
        tags: { code: 'Tag.NotFound', message: 'Etiqueta não encontrada.' },
        category: { code: 'Category.NotFound', message: 'Categoria não encontrada.' },
      });
    });

    it('leaves a key that only starts with the alias and a nested key of another field on their own paths', () => {
      const problem: ApiProblem = {
        status: 400,
        errors: {
          TagIdsArchived: [{ message: 'Outro campo.' }],
          'Guardians[0].TagIds': [{ message: 'Campo de outro item.' }],
        },
      };

      const { fieldErrors } = toFormErrors(problem, PICKER_FIELDS, ALIASES);

      expect(fieldErrors).toEqual({
        tagIdsArchived: { message: 'Outro campo.' },
        'guardians.0.tagIds': { message: 'Campo de outro item.' },
      });
    });
  });
});
