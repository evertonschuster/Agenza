import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/shared/result';
import type { ApiProblem } from './servicesFacade';
import { ApiProblemError, isApiProblemError, unwrapOrThrow } from './unwrap';

const problem: ApiProblem = {
  title: 'Categoria não foi encontrada.',
  status: 404,
  code: 'Category.NotFound',
};

describe('unwrapOrThrow', () => {
  it('returns the payload on the success branch', () => {
    expect(unwrapOrThrow(ok(42))).toBe(42);
  });

  it('throws an ApiProblemError carrying the original problem by reference', () => {
    let caught: unknown;
    try {
      unwrapOrThrow(fail(problem));
    } catch (error) {
      caught = error;
    }

    expect(isApiProblemError(caught)).toBe(true);
    if (isApiProblemError(caught)) expect(caught.problem).toBe(problem);
  });

  it('takes the message from title, falling back to code when there is no title', () => {
    expect(new ApiProblemError(problem).message).toBe('Categoria não foi encontrada.');
    expect(new ApiProblemError({ code: 'Category.NotFound' }).message).toBe('Category.NotFound');
  });
});

describe('isApiProblemError', () => {
  it('is false for a plain Error and for non-Error values', () => {
    expect(isApiProblemError(new Error('boom'))).toBe(false);
    expect(isApiProblemError('ApiProblemError')).toBe(false);
    expect(isApiProblemError(null)).toBe(false);
    expect(isApiProblemError({ problem })).toBe(false);
  });
});
