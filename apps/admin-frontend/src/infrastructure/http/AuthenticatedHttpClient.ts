import type { HttpClient } from '../../application/ports/HttpClient'
import { ApiError } from './ApiError'
import { UnauthenticatedError } from './UnauthenticatedError'

interface ErrorPayload {
  error?: string
  message?: string
  details?: unknown
}

/**
 * The only HttpClient implementation - every REST repository depends on
 * the HttpClient port, never on this class directly (docs/API.md). Reads
 * the access token via a callback rather than an AuthRepository reference
 * directly, so this class doesn't need to know how sessions are stored.
 */
export class AuthenticatedHttpClient implements HttpClient {
  private readonly baseUrl: string
  private readonly getAccessToken: () => Promise<string | null>

  constructor(baseUrl: string, getAccessToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl
    this.getAccessToken = getAccessToken
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async delete(path: string): Promise<void> {
    await this.request<undefined>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const accessToken = await this.getAccessToken()
    if (accessToken === null) {
      throw new UnauthenticatedError()
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }

    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    const response = await fetch(`${this.baseUrl}${path}`, init)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null
      throw new ApiError(response.status, payload?.message ?? response.statusText, payload?.details)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }
}
