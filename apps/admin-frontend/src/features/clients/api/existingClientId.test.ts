import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { existingClientIdFrom } from './existingClientId';

const EXISTING_ID = '0197f2a0-0000-7000-8000-000000000001';

describe('existingClientIdFrom', () => {
  it('reads the id of the client that already owns the CPF', () => {
    const problem: ApiProblem = {
      status: 409,
      code: 'Client.DuplicateCpf',
      errors: {
        Cpf: [
          {
            code: 'Client.DuplicateCpf',
            message: 'Já existe uma pessoa cadastrada com este CPF.',
            meta: { clientId: EXISTING_ID },
          },
        ],
      },
    };

    expect(existingClientIdFrom(problem)).toBe(EXISTING_ID);
  });

  it('has nothing to open when the CPF belongs to a deleted client', () => {
    const problem: ApiProblem = {
      status: 409,
      code: 'Client.DuplicateCpf',
      errors: {
        Cpf: [
          { code: 'Client.DuplicateCpf', message: 'Este CPF pertence a um cadastro excluído.' },
        ],
      },
    };

    expect(existingClientIdFrom(problem)).toBeNull();
  });

  it('ignores a conflict that is not about the CPF', () => {
    const problem: ApiProblem = {
      status: 409,
      code: 'Client.DuplicateEmail',
      errors: {
        Email: [
          { code: 'Client.DuplicateEmail', message: 'Já existe.', meta: { clientId: EXISTING_ID } },
        ],
      },
    };

    expect(existingClientIdFrom(problem)).toBeNull();
  });

  it.each([
    ['no errors at all', { status: 0, title: 'Sem conexão.' } satisfies ApiProblem],
    [
      'a form-level error',
      { status: 409, errors: { '': [{ message: 'Conflito.' }] } } satisfies ApiProblem,
    ],
  ])('returns null for %s', (_name, problem) => {
    expect(existingClientIdFrom(problem)).toBeNull();
  });
});
