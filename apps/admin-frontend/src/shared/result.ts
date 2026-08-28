/**
 * A computation outcome: either a value (`ok`) or a failure (`error`). One type carries both.
 *
 * Callers branch on `.ok` (the discriminant) — TypeScript narrows each side — instead of
 * `try/catch`. Producers return `ok(...)` / `fail(...)` and never throw for expected failures.
 */
export type Result<T, E> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });
