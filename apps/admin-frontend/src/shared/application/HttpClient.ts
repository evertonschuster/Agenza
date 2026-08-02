import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

// Validates/narrows an unknown JSON payload into T, throwing if it doesn't
// match - a repository's own mapper owns this, never a bare `as T` (docs/adr/011).
export type Decoder<T> = (payload: unknown) => T

// A generic type parameter alone validates nothing at runtime - the Decoder
// is what actually stands between an untrusted response body and a T. Never
// rejects - every failure (network, auth, malformed payload, backend error)
// comes back as Result.failure(AppError) so a caller's type signature can't
// forget that a request can fail.
export interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<Result<T, AppError>>
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>>
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>>
  delete(path: string): Promise<Result<void, AppError>>
}
