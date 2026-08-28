import type { Result } from '@/shared/result';
import type { components } from './generated/services-api.d.ts';

type ProblemDetails = components['schemas']['ApiProblemDetails'];

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
  readonly code: string | null;
}

export interface ApiFailure {
  readonly kind:
    | 'validation'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'network'
    | 'server'
    | 'unknown';
  readonly message: string;
  readonly fieldIssues: readonly FieldIssue[];
  readonly code: string | null;
  readonly status: number | null;
  readonly traceId: string | null;
}

export type ApiResult<T> = Result<T, ApiFailure>;

function kindFromStatus(status: number): ApiFailure['kind'] {
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    default:
      return status >= 500 ? 'server' : 'unknown';
  }
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function toFieldIssues(errors: ProblemDetails['errors']): FieldIssue[] {
  if (!errors) return [];
  return Object.entries(errors).flatMap(([field, issues]) =>
    (issues ?? []).map((issue) => ({
      field,
      message: issue.message ?? 'Valor inválido.',
      code: issue.code ?? null,
    })),
  );
}

export function toApiFailure(status: number, problem: unknown): ApiFailure {
  const p = (problem ?? {}) as Partial<ProblemDetails>;
  const resolvedStatus = toFiniteNumber(p.status) ?? status;
  return {
    kind: kindFromStatus(resolvedStatus),
    message: p.detail ?? p.title ?? 'Ocorreu um erro inesperado. Tente novamente.',
    fieldIssues: toFieldIssues(p.errors),
    code: p.code ?? null,
    status: resolvedStatus,
    traceId: p.traceId ?? null,
  };
}

export function networkFailure(): ApiFailure {
  return {
    kind: 'network',
    message: 'Não foi possível contatar o servidor. Verifique sua conexão e tente novamente.',
    fieldIssues: [],
    code: null,
    status: null,
    traceId: null,
  };
}

export function serverFailure(): ApiFailure {
  return {
    kind: 'server',
    message: 'O servidor retornou uma resposta inesperada. Tente novamente.',
    fieldIssues: [],
    code: null,
    status: null,
    traceId: null,
  };
}
