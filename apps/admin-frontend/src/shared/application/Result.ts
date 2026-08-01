export interface Success<T> {
  readonly success: true
  readonly value: T
}

export interface Failure<E> {
  readonly success: false
  readonly error: E
}

export type Result<T, E> = Success<T> | Failure<E>

export function success<T>(value: T): Success<T> {
  return { success: true, value }
}

export function failure<E>(error: E): Failure<E> {
  return { success: false, error }
}

export function mapResult<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return result.success ? success(transform(result.value)) : result
}

// Chains a Result-returning step onto another Result without nesting -
// the composition primitive that keeps a pipeline of possibly-failing
// steps (decode -> domain validation) throw-free end to end.
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  transform: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.success ? transform(result.value) : result
}

// Fail-fast: the first Failure in the list short-circuits the rest: the
// same "any one item can spoil the batch" semantics as Promise.all, for
// synchronous Results instead of promises.
export function combineResults<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = []
  for (const result of results) {
    if (!result.success) {
      return result
    }
    values.push(result.value)
  }
  return success(values)
}
