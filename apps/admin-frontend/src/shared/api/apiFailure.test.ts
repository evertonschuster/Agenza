import { describe, expect, it } from 'vitest';
import { networkFailure, serverFailure, toApiFailure } from './apiFailure';

describe('toApiFailure', () => {
  it('maps a 400 with field errors to a validation failure with per-field issues', () => {
    const failure = toApiFailure(400, {
      title: 'Bad Request',
      detail: 'A validação falhou.',
      status: 400,
      code: 'validation_error',
      traceId: 'trace-1',
      errors: {
        name: [{ code: 'required', message: 'Nome é obrigatório.' }],
        search: [{ message: 'Muito curto.' }],
      },
    });

    expect(failure.kind).toBe('validation');
    expect(failure.message).toBe('A validação falhou.');
    expect(failure.code).toBe('validation_error');
    expect(failure.traceId).toBe('trace-1');
    expect(failure.fieldIssues).toEqual([
      { field: 'name', message: 'Nome é obrigatório.', code: 'required' },
      { field: 'search', message: 'Muito curto.', code: null },
    ]);
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('maps HTTP %s to kind "%s"', (status, kind) => {
    expect(toApiFailure(status, null).kind).toBe(kind);
  });

  it('falls back to generic copy when the body carries no detail or title', () => {
    const failure = toApiFailure(500, {});
    expect(failure.message).toBe('Ocorreu um erro inesperado. Tente novamente.');
    expect(failure.fieldIssues).toEqual([]);
  });

  it('networkFailure / serverFailure carry the right kind and no field issues', () => {
    expect(networkFailure().kind).toBe('network');
    expect(serverFailure().kind).toBe('server');
    expect(networkFailure().fieldIssues).toEqual([]);
  });
});
