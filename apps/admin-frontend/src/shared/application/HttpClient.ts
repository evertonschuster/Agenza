/**
 * Port every REST repository depends on instead of talking to fetch/axios
 * directly (docs/API.md). Kept minimal - JSON in, JSON out - since the
 * shape of any given resource is the repository's concern, not the
 * transport's.
 */
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
}
