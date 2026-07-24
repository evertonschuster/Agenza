// Validates/narrows an unknown JSON payload into T, throwing if it doesn't
// match - a repository's own mapper owns this, never a bare `as T` (docs/adr/011).
export type Decoder<T> = (payload: unknown) => T

// A generic type parameter alone validates nothing at runtime - the Decoder
// is what actually stands between an untrusted response body and a T.
export interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<T>
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  delete(path: string): Promise<void>
}
