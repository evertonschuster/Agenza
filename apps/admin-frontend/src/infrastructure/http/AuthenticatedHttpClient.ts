import type { HttpClient } from '../../application/ports/HttpClient'
import { ApiError } from './ApiError'
import { UnauthenticatedError } from './UnauthenticatedError'

/** RFC 7807 Problem Details - the confirmed error shape (docs/API.md). */
interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
}

/**
 * The only HttpClient implementation - every REST repository depends on
 * the HttpClient port, never on this class directly (docs/API.md). Reads
 * the access token and tenant id via callbacks rather than an
 * AuthRepository reference directly, so this class doesn't need to know
 * how sessions are stored.
 */
export class AuthenticatedHttpClient implements HttpClient {
  private readonly baseUrl: string
  private readonly getAccessToken: () => Promise<string | null>
  private readonly getTenantId: () => Promise<string | null>

  constructor(
    baseUrl: string,
    getAccessToken: () => Promise<string | null>,
    getTenantId: () => Promise<string | null>,
  ) {
    this.baseUrl = baseUrl
    this.getAccessToken = getAccessToken
    this.getTenantId = getTenantId
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

    // The backend verifies this header against the token's tenant_id
    // claim and rejects any mismatch (repo non-negotiable: never trust a
    // client-supplied tenant id without checking it against the
    // authenticated principal) - sent whenever a tenant is known, absent
    // for pre-tenant flows (e.g. before a session exists).
    const tenantId = await this.getTenantId()
    if (tenantId !== null) {
      headers['X-Tenant-Id'] = tenantId
    }

    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthenticatedError()
      }
      const payload = (await response.json().catch(() => null)) as ProblemDetails | null
      const message = payload?.title ?? payload?.detail ?? response.statusText
      throw new ApiError(response.status, message, payload ?? undefined)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }
}
