import { describe, expect, it, vi } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { applyApiProblem } from './applyApiProblem';

interface DummyValues {
  name: string;
  color: string;
}

const FIELDS = ['name', 'color'] as const;

describe('applyApiProblem', () => {
  it('sets an error for each mapped field', () => {
    const setError = vi.fn();
    const problem: ApiProblem = {
      status: 400,
      title: 'Ocorreram erros de validação.',
      errors: {
        Name: [{ message: 'O nome é obrigatório.' }],
      },
    };

    applyApiProblem<DummyValues>(problem, FIELDS, setError);

    expect(setError).toHaveBeenCalledWith('name', {
      type: 'server',
      message: 'O nome é obrigatório.',
    });
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it('sets root.serverError for an unmatched form-level message, without touching any field', () => {
    const setError = vi.fn();
    const problem: ApiProblem = {
      status: 409,
      title: 'Já existe um registro com esse nome.',
      errors: {
        '': [{ message: 'Já existe um registro com esse nome.' }],
      },
    };

    applyApiProblem<DummyValues>(problem, FIELDS, setError);

    expect(setError).toHaveBeenCalledWith('root.serverError', {
      type: 'server',
      message: 'Já existe um registro com esse nome.',
    });
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no field error and no form-level message', () => {
    const setError = vi.fn();
    const problem: ApiProblem = { status: 400, title: '', errors: {} };

    applyApiProblem<DummyValues>(problem, FIELDS, setError);

    expect(setError).not.toHaveBeenCalled();
  });
});
