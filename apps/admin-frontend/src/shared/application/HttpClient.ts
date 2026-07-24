/**
 * Validates/narrows a JSON payload of unknown shape into T, throwing if it
 * doesn't match - a repository's own mapper owns this (e.g. tagMapper's
 * decodeTagDto), never a bare `as T` (see docs/adr/011).
 */
export type Decoder<T> = (payload: unknown) => T

/**
 * Port every REST repository depends on instead of talking to fetch/axios
 * directly (docs/API.md). Kept minimal - JSON in, JSON out - since the
 * shape of any given resource is the repository's concern, not the
 * transport's. Every read method takes a Decoder instead of trusting a
 * caller-chosen generic: a generic type parameter alone validates nothing
 * at runtime, so the decoder is what actually stands between an untrusted
 * response body and a value the rest of the app treats as T.
 */
export interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<T>
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  delete(path: string): Promise<void>
}
