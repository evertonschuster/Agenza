import type { Result } from '@/shared/result';
import type { components } from './generated/services-api.d.ts';

type ProblemDetails = components['schemas']['ApiProblemDetails'];

/** One field-level validation message, ready to bind next to a form input. */
export interface FieldIssue {
  readonly field: string;
  readonly message: string;
  readonly code: string | null;
}

/**
 * A backend failure, normalized for the UI. Plain data — never an `Error`, never thrown.
 * The interface layer branches on `kind` and can render `message` / `fieldIssues` directly.
 */
export interface ApiFailure {
  /** What kind of failure this is — branch on this, not on raw HTTP status codes. */
  readonly kind:
    | 'validation'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'network'
    | 'server'
    | 'unknown';
  /** Safe to render to the user as-is (backend `detail`/`title`, or our fallback copy). */
  readonly message: string;
  /** Per-field validation messages (backend `errors`); empty for non-validation failures. */
  readonly fieldIssues: readonly FieldIssue[];
  /** Backend machine code (`ApiProblemDetails.code`), for i18n keys or conditional handling. */
  readonly code: string | null;
  /** HTTP status, when there was a response. */
  readonly status: number | null;
  /** Correlates with backend logs — surface it in a "contact support" message. */
  readonly traceId: string | null;
}

/** The result type every repository method returns: a value, or an `ApiFailure`. Never throws. */
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

/**
 * The one place that reads the backend's Problem Details shape (RFC 7807/9457).
 * `problem` is whatever the API client handed back for an error response — treated defensively.
 */
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

/** A request that never reached the backend (offline, DNS, CORS, aborted). */
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

/** The backend answered 2xx but the body did not match the expected envelope. */
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
