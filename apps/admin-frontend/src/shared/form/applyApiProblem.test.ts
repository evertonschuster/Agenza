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
    applyApiProblem(
      {
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
    );
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

    applyApiProblem<DummyValues>(problem, methods);

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

    applyApiProblem<DummyValues>(problem, methods);

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

    applyApiProblem<DummyValues>(problem, methods);

    expect(methods.setError).toHaveBeenCalledExactlyOnceWith('root.serverError', {
      type: 'RateLimit.Exceeded',
      message: 'Muitas solicitações em pouco tempo.',
    });
  });

  it('does nothing when there is no field error and no form-level message', () => {
    const methods = formMethods();
    const problem: ApiProblem = { status: 400, title: '', errors: {} };

    applyApiProblem<DummyValues>(problem, methods);

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

    applyApiProblem(problem, methods);

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

    applyApiProblem(
      { status: 400, errors: { Guardians: [{ message: 'Informe um responsável.' }] } },
      methods,
    );

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

    applyApiProblem(
      {
        status: 400,
        errors: {
          Name: [{ message: 'Nome obrigatório.' }],
          Color: [{ message: 'Cor obrigatória.' }],
          BirthDate: [{ message: 'Data inválida.' }],
          Unknown: [{ message: 'Erro geral.' }],
        },
      },
      methods,
    );

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
});
