import type { HttpClient } from '../../application/ports/HttpClient'
import type { SessionInvalidationNotifier } from '../../application/ports/SessionEventBus'
import { ApiError } from './ApiError'
import { parseProblemDetails } from './ProblemDetails'
import { UnauthenticatedError } from './UnauthenticatedError'
import { NetworkError } from './NetworkError'
import { TimeoutError } from './TimeoutError'
import { mapErrorToAppError } from './mapErrorToAppError'

const NOOP_SESSION_NOTIFIER: SessionInvalidationNotifier = {
  notifyUnauthenticated: () => {
    /* no-op default so tests that don't care about session invalidation don't need to pass one */
  },
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
  private readonly sessionInvalidationNotifier: SessionInvalidationNotifier

  constructor(
    baseUrl: string,
    getAccessToken: () => Promise<string | null>,
    getTenantId: () => Promise<string | null>,
    sessionInvalidationNotifier: SessionInvalidationNotifier = NOOP_SESSION_NOTIFIER,
  ) {
    this.baseUrl = baseUrl
    this.getAccessToken = getAccessToken
    this.getTenantId = getTenantId
    this.sessionInvalidationNotifier = sessionInvalidationNotifier
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

  /**
   * Every failure path below (missing token, 401, non-2xx ProblemDetails,
   * a fetch-level network/timeout failure) is converted to AppError by the
   * single catch at the bottom before it leaves this method - callers
   * (repositories, use cases, forms) only ever see AppError, never ApiError/
   * UnauthenticatedError/NetworkError/TimeoutError directly (docs/adr/007).
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      const accessToken = await this.getAccessToken()
      if (accessToken === null) {
        this.sessionInvalidationNotifier.notifyUnauthenticated()
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

      let response: Response
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          signal: AbortSignal.timeout(15000),
        })
      } catch (fetchError) {
        // AbortSignal.timeout() aborts with a DOMException named
        // "TimeoutError" specifically (distinct from a user-triggered
        // abort) - anything else is a genuine network failure (offline,
        // DNS, connection refused).
        throw fetchError instanceof DOMException && fetchError.name === 'TimeoutError'
          ? new TimeoutError()
          : new NetworkError()
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.sessionInvalidationNotifier.notifyUnauthenticated()
          throw new UnauthenticatedError()
        }
        const rawPayload: unknown = await response.json().catch(() => null)
        const payload = parseProblemDetails(rawPayload)
        const message = payload?.title ?? payload?.detail ?? response.statusText
        throw new ApiError(response.status, message, payload ?? undefined)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      throw mapErrorToAppError(error)
    }
  }
}
