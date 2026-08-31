export type Result<T, E> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const mapOk = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.data)) : result;
