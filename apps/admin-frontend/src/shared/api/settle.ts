import { fail } from '@/shared/result';
import type { ApiProblem, ApiResult } from './servicesFacade';

export const NETWORK_PROBLEM: ApiProblem = {
  status: 0,
  code: 'Network.Unreachable',
  title: 'Sem conexão com o servidor. Tente novamente.',
};

export const SERVER_PROBLEM: ApiProblem = {
  status: 0,
  code: 'Server.Unavailable',
  title: 'O servidor está instável. Tente novamente em instantes.',
};

const renderable = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'title' in error &&
  typeof error.title === 'string';

export async function settle<T>(call: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    const result = await call;
    if (!result.ok && !renderable(result.error)) return fail(SERVER_PROBLEM);
    return result;
  } catch {
    return fail(NETWORK_PROBLEM);
  }
}
