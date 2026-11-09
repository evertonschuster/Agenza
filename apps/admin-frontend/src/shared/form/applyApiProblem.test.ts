import { describe, expect, it, vi } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { applyApiProblem } from './applyApiProblem';

interface DummyValues {
  name: string;
  color: string;
}

function formMethods() {
  return {
    getValues: () => ({ name: '', color: '' }),
    setError: vi.fn(),
    setFocus: vi.fn(),
  };
}

describe('applyApiProblem', () => {
  it('keeps the field code and metadata in the form error', () => {
    const methods = {
      getValues: () => ({ cpf: '' }),
      setError: vi.fn(),
      setFocus: vi.fn(),
    };
    applyApiProblem({
      problem: {
        errors: {
          Cpf: [
            {
              code: 'Client.DuplicateCpf',
              message: 'CPF em uso.',
              meta: { clientId: 'existing-person' },
            },
          ],
        },
      },
      methods,
    });
    expect(methods.setError).toHaveBeenCalledWith('cpf', {
      type: 'Client.DuplicateCpf',
      message: 'CPF em uso.',
      meta: { clientId: 'existing-person' },
    });
    expect(methods.setFocus).toHaveBeenCalledWith('cpf');
  });
  it('sets an error for each mapped field', () => {
    const methods = formMethods();
    const problem: ApiProblem = {
      status: 400,
      title: 'Ocorreram erros de validação.',
      errors: {
        Name: [{ message: 'O nome é obrigatório.' }],
      },
    };

    applyApiProblem<DummyValues>({ problem, methods });

    expect(methods.setError).toHaveBeenCalledWith('name', {
      type: 'server',
      message: 'O nome é obrigatório.',
    });
    expect(methods.setError).toHaveBeenCalledTimes(1);
    expect(methods.setFocus).toHaveBeenCalledExactlyOnceWith('name');
  });

  it('sets root.serverError for an unmatched form-level message, without touching any field', () => {
    const methods = formMethods();
    const problem: ApiProblem = {
      status: 409,
      title: 'Já existe um registro com esse nome.',
      errors: {
        '': [{ message: 'Já existe um registro com esse nome.' }],
      },
    };

    applyApiProblem<DummyValues>({ problem, methods });

    expect(methods.setError).toHaveBeenCalledWith('root.serverError', {
      type: 'server',
      message: 'Já existe um registro com esse nome.',
    });
    expect(methods.setError).toHaveBeenCalledTimes(1);
    expect(methods.setFocus).not.toHaveBeenCalled();
  });

  it('keeps the problem code as the type of root.serverError, so the banner can show it', () => {
    const methods = formMethods();
    const problem: ApiProblem = {
      status: 429,
      code: 'RateLimit.Exceeded',
      title: 'Muitas solicitações em pouco tempo.',
    };

    applyApiProblem<DummyValues>({ problem, methods });

    expect(methods.setError).toHaveBeenCalledExactlyOnceWith('root.serverError', {
      type: 'RateLimit.Exceeded',
      message: 'Muitas solicitações em pouco tempo.',
    });
  });

  it('does nothing when there is no field error and no form-level message', () => {
    const methods = formMethods();
    const problem: ApiProblem = { status: 400, title: '', errors: {} };

    applyApiProblem<DummyValues>({ problem, methods });

    expect(methods.setError).not.toHaveBeenCalled();
    expect(methods.setFocus).not.toHaveBeenCalled();
  });

  it('maps current nested array items and focuses the first invalid field in form order', () => {
    const methods = {
      getValues: () => ({
        guardians: [{ name: 'Ana' }, { name: '' }],
        referenceContacts: [{ purposes: ['operationalSupport'] }],
      }),
      setError: vi.fn(),
      setFocus: vi.fn(),
    };
    const problem: ApiProblem = {
      status: 400,
      errors: {
        'ReferenceContacts[0].Purposes[0]': [{ message: 'Finalidade inválida.' }],
        'Guardians[1].Name': [{ message: 'O nome do responsável é obrigatório.' }],
      },
    };

    applyApiProblem({ problem, methods });

    expect(methods.setError).toHaveBeenCalledWith('guardians.1.name', {
      type: 'server',
      message: 'O nome do responsável é obrigatório.',
    });
    expect(methods.setError).toHaveBeenCalledWith('referenceContacts.0.purposes.0', {
      type: 'server',
      message: 'Finalidade inválida.',
    });
    expect(methods.setError).toHaveBeenCalledTimes(2);
    expect(methods.setFocus).toHaveBeenCalledExactlyOnceWith('guardians.1.name');
  });

  it('maps array-level errors even when the array is empty', () => {
    const methods = {
      getValues: () => ({ guardians: [] }),
      setError: vi.fn(),
      setFocus: vi.fn(),
    };

    applyApiProblem({
      problem: { status: 400, errors: { Guardians: [{ message: 'Informe um responsável.' }] } },
      methods,
    });

    expect(methods.setError).toHaveBeenCalledExactlyOnceWith('guardians', {
      type: 'server',
      message: 'Informe um responsável.',
    });
  });

  it('treats null, undefined and dates as field values and unknown paths as form errors', () => {
    const methods = {
      getValues: () => ({ name: undefined, color: null, birthDate: new Date('2000-01-01') }),
      setError: vi.fn(),
      setFocus: vi.fn(),
    };

    applyApiProblem({
      problem: {
        status: 400,
        errors: {
          Name: [{ message: 'Nome obrigatório.' }],
          Color: [{ message: 'Cor obrigatória.' }],
          BirthDate: [{ message: 'Data inválida.' }],
          Unknown: [{ message: 'Erro geral.' }],
        },
      },
      methods,
    });

    expect(methods.setError).toHaveBeenNthCalledWith(1, 'name', {
      type: 'server',
      message: 'Nome obrigatório.',
    });
    expect(methods.setError).toHaveBeenNthCalledWith(2, 'color', {
      type: 'server',
      message: 'Cor obrigatória.',
    });
    expect(methods.setError).toHaveBeenNthCalledWith(3, 'birthDate', {
      type: 'server',
      message: 'Data inválida.',
    });
    expect(methods.setError).toHaveBeenNthCalledWith(4, 'root.serverError', {
      type: 'server',
      message: 'Erro geral.',
    });
    expect(methods.setError).toHaveBeenCalledTimes(4);
    expect(methods.setFocus).toHaveBeenCalledExactlyOnceWith('name');
  });

  describe('aliases', () => {
    function pickerForm() {
      return {
        getValues: () => ({
          fullName: '',
          category: null,
          tags: [{ id: 't1', name: 'VIP' }],
          guardians: [{ tagIds: '' }],
          tagIdsArchived: '',
        }),
        setError: vi.fn(),
        setFocus: vi.fn(),
      };
    }

    it('shows the errors of an aliased command field and of its items on the form field, the first from the server', () => {
      const methods = pickerForm();

      applyApiProblem({
        problem: {
          status: 400,
          errors: {
            TagIds: [{ code: 'Client.DuplicateTag', message: 'Etiqueta repetida.' }],
            'TagIds[0]': [{ code: 'Client.TagIdRequired', message: 'Informe a etiqueta.' }],
            'TagIds[0].Value': [{ code: 'Other', message: 'Outro erro da etiqueta.' }],
          },
        },
        methods,
        aliases: { tagIds: 'tags' },
      });

      expect(methods.setError).toHaveBeenCalledExactlyOnceWith('tags', {
        type: 'Client.DuplicateTag',
        message: 'Etiqueta repetida.',
      });
      expect(methods.setFocus).toHaveBeenCalledExactlyOnceWith('tags');
    });

    it('shows an item error on the form field when the server sends no error on the list', () => {
      const methods = pickerForm();

      applyApiProblem({
        problem: {
          status: 400,
          errors: {
            'TagIds[0]': [{ code: 'Client.TagIdRequired', message: 'Informe a etiqueta.' }],
          },
        },
        methods,
        aliases: { tagIds: 'tags' },
      });

      expect(methods.setError).toHaveBeenCalledExactlyOnceWith('tags', {
        type: 'Client.TagIdRequired',
        message: 'Informe a etiqueta.',
      });
    });

    it('takes each alias to its own form field, an empty single pick included, in form order', () => {
      const methods = pickerForm();

      applyApiProblem({
        problem: {
          status: 400,
          errors: {
            TagIds: [{ code: 'Tag.NotFound', message: 'Etiqueta não encontrada.' }],
            CategoryId: [{ code: 'Category.NotFound', message: 'Categoria não encontrada.' }],
          },
        },
        methods,
        aliases: { categoryId: 'category', tagIds: 'tags' },
      });

      expect(methods.setError).toHaveBeenNthCalledWith(1, 'category', {
        type: 'Category.NotFound',
        message: 'Categoria não encontrada.',
      });
      expect(methods.setError).toHaveBeenNthCalledWith(2, 'tags', {
        type: 'Tag.NotFound',
        message: 'Etiqueta não encontrada.',
      });
      expect(methods.setFocus).toHaveBeenCalledExactlyOnceWith('category');
    });

    it('leaves a key that only starts with the alias and a nested key of another field on their own paths', () => {
      const methods = pickerForm();

      applyApiProblem({
        problem: {
          status: 400,
          errors: {
            TagIdsArchived: [{ message: 'Outro campo.' }],
            'Guardians[0].TagIds': [{ message: 'Campo de outro item.' }],
          },
        },
        methods,
        aliases: { tagIds: 'tags' },
      });

      expect(methods.setError).toHaveBeenCalledWith('guardians.0.tagIds', {
        type: 'server',
        message: 'Campo de outro item.',
      });
      expect(methods.setError).toHaveBeenCalledWith('tagIdsArchived', {
        type: 'server',
        message: 'Outro campo.',
      });
      expect(methods.setError).toHaveBeenCalledTimes(2);
    });
  });
});
