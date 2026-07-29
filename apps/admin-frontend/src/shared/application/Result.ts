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
