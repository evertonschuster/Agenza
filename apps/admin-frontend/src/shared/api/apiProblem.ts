import type { Result } from '@/shared/result';
import type { components } from './generated/services-api.d.ts';

export type ApiProblem = components['schemas']['ApiProblemDetails'];

export type ApiResult<T> = Result<T, ApiProblem>;

export const NETWORK_PROBLEM: ApiProblem = {
  status: 0,
  title: 'Não foi possível contatar o servidor. Verifique sua conexão e tente novamente.',
  code: 'Network.Unreachable',
};

export function asProblem(status: number, body: unknown): ApiProblem {
  return body !== null && typeof body === 'object' && !Array.isArray(body) && 'title' in body
    ? (body as ApiProblem)
    : { status, title: 'O servidor retornou uma resposta inesperada.', code: 'Http.Unexpected' };
}
