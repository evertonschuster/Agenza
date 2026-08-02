import type { Decoder, HttpClient } from '@/shared/application/HttpClient'
import type { SessionInvalidationNotifier } from '@/shared/application/SessionEventBus'
import type { GetRequestSession } from '@/shared/application/RequestSession'
import type { AppError } from '@/shared/application/AppError'
import { type Result, success, failure } from '@/shared/application/Result'
import { UnauthenticatedError } from '@/shared/infrastructure/http/UnauthenticatedError'
import { NetworkError } from '@/shared/infrastructure/http/NetworkError'
import { TimeoutError } from '@/shared/infrastructure/http/TimeoutError'
import { mapErrorToAppError } from '@/shared/infrastructure/http/mapErrorToAppError'
import { parseApiResponse } from '@/shared/infrastructure/http/parseApiResponse'

const NOOP_SESSION_NOTIFIER: SessionInvalidationNotifier = {
  notifyUnauthenticated: () => void 0,
}

/** The only HttpClient implementation (docs/API.md) - every REST repository depends on the port, not this class. */
export class AuthenticatedHttpClient implements HttpClient {
  private readonly baseUrl: string
  private readonly getRequestSession: GetRequestSession
  private readonly sessionInvalidationNotifier: SessionInvalidationNotifier

  constructor(
    baseUrl: string,
    getRequestSession: GetRequestSession,
    sessionInvalidationNotifier: SessionInvalidationNotifier = NOOP_SESSION_NOTIFIER,
  ) {
    this.baseUrl = baseUrl
    this.getRequestSession = getRequestSession
    this.sessionInvalidationNotifier = sessionInvalidationNotifier
  }

  async get<T>(path: string, decode: Decoder<T>): Promise<Result<T, AppError>> {
    return this.request(decode, 'GET', path)
  }

  async post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>> {
    return this.request(decode, 'POST', path, body)
  }

  async put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>> {
    return this.request(decode, 'PUT', path, body)
  }

  async delete(path: string): Promise<Result<void, AppError>> {
    return this.request<undefined>(() => undefined, 'DELETE', path)
  }

  // Attaches the bearer token and tenant header, makes the request, and
  // reacts to session-level failures (missing session, 401, timeout,
  // network). Response-body parsing is delegated to parseApiResponse -
  // this class only knows the JWT/session side. Never rejects - every
  // failure comes back as Result.failure(AppError) instead.
  private async request<T>(
    decode: Decoder<T>,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Result<T, AppError>> {
    try {
      const requestSession = await this.getRequestSession()
      if (requestSession === null) {
        this.sessionInvalidationNotifier.notifyUnauthenticated()
        throw new UnauthenticatedError()
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${requestSession.accessToken}`,
      }

      // Backend re-verifies this against the token's tenant_id claim and
      // rejects any mismatch - never trust a client-supplied tenant id alone.
      if (requestSession.tenantId !== null) {
        headers['X-Tenant-Id'] = requestSession.tenantId
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

      if (response.status === 401) {
        this.sessionInvalidationNotifier.notifyUnauthenticated()
        throw new UnauthenticatedError()
      }

      const value = await parseApiResponse(response, decode)
      return success(value)
    } catch (error) {
      return failure(mapErrorToAppError(error))
    }
  }
}
