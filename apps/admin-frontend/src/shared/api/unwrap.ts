import type { ApiResult, ApiProblem } from './servicesFacade';

export class ApiProblemError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.title ?? problem.code ?? undefined);
    this.name = 'ApiProblemError';
    this.problem = problem;
  }
}

export function unwrapOrThrow<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  throw new ApiProblemError(result.error);
}

export function isApiProblemError(value: unknown): value is ApiProblemError {
  return value instanceof ApiProblemError;
}
