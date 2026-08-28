import type { Result } from '@/shared/result';

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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function toFieldIssues(errors: unknown): FieldIssue[] {
  return Object.entries(asRecord(errors)).flatMap(([field, issues]) =>
    (Array.isArray(issues) ? issues : []).map((issue) => {
      const record = asRecord(issue);
      return {
        field,
        message: asString(record.message) ?? 'Valor inválido.',
        code: asString(record.code),
      };
    }),
  );
}

export function toApiFailure(status: number, problem: unknown): ApiFailure {
  const p = asRecord(problem);
  const resolvedStatus = toFiniteNumber(p.status) ?? status;
  return {
    kind: kindFromStatus(resolvedStatus),
    message:
      asString(p.detail) ?? asString(p.title) ?? 'Ocorreu um erro inesperado. Tente novamente.',
    fieldIssues: toFieldIssues(p.errors),
    code: asString(p.code),
    status: resolvedStatus,
    traceId: asString(p.traceId),
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
