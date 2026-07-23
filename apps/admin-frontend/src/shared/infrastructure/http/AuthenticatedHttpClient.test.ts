import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { AuthenticatedHttpClient } from '@/shared/infrastructure/http/AuthenticatedHttpClient'
import { AppError } from '@/shared/application/AppError'
import type { RequestSession } from '@/shared/application/RequestSession'
import type { Decoder } from '@/shared/application/HttpClient'

const baseUrl = 'https://api.test'

function withSession(accessToken: string, tenantId: string | null = 'tenant-abc') {
  return (): Promise<RequestSession | null> => Promise.resolve({ accessToken, tenantId })
}

const noSession = (): Promise<RequestSession | null> => Promise.resolve(null)

interface Widget {
  id: string
  name: string
}

function decodeWidget(payload: unknown): Widget {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as Record<string, unknown>).id !== 'string' ||
    typeof (payload as Record<string, unknown>).name !== 'string'
  ) {
    throw new Error('Malformed widget payload')
  }
  return payload as Widget
}

// Used by tests that only care about the request/error path, never the
// decoded value - a real decoder would be pure overhead there.
const ignoreBody: Decoder<unknown> = payload => payload

describe('AuthenticatedHttpClient', () => {
  it('attaches the bearer token and returns the parsed JSON body', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer token-123')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const result = await client.get('/widgets/1', decodeWidget)

    expect(result).toEqual({ id: '1', name: 'Widget' })
  })

  it('sends a JSON body and Content-Type on post', async () => {
    server.use(
      http.post(`${baseUrl}/widgets`, async ({ request }) => {
        expect(request.headers.get('Content-Type')).toBe('application/json')
        expect(await request.json()).toEqual({ name: 'Widget' })
        return HttpResponse.json({ id: '1', name: 'Widget' }, { status: 201 })
      }),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const result = await client.post('/widgets', { name: 'Widget' }, decodeWidget)

    expect(result).toEqual({ id: '1', name: 'Widget' })
  })

  it('throws an unauthenticated AppError instead of making a request when there is no session', async () => {
    const client = new AuthenticatedHttpClient(baseUrl, noSession)

    const error = await client.get('/widgets/1', ignoreBody).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unauthenticated')
  })

  it('notifies the session invalidation notifier when there is no session', async () => {
    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(baseUrl, noSession, { notifyUnauthenticated })

    await client.get('/widgets/1', ignoreBody).catch(() => undefined)

    expect(notifyUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('attaches the X-Tenant-Id header when a tenant is known', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('X-Tenant-Id')).toBe('tenant-abc')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    await client.get('/widgets/1', ignoreBody)
  })

  it('omits the X-Tenant-Id header when no tenant is known', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.has('X-Tenant-Id')).toBe(false)
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123', null))

    await client.get('/widgets/1', ignoreBody)
  })

  it('reads the session exactly once per request, and the token/tenant headers come from that same read', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer token-from-the-only-read')
        expect(request.headers.get('X-Tenant-Id')).toBe('tenant-from-the-only-read')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const getRequestSession = vi.fn(
      withSession('token-from-the-only-read', 'tenant-from-the-only-read'),
    )
    const client = new AuthenticatedHttpClient(baseUrl, getRequestSession)

    await client.get('/widgets/1', ignoreBody)

    expect(getRequestSession).toHaveBeenCalledTimes(1)
  })

  it('maps a 404 Problem Details response to a notFound AppError, preserving the title as the message', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/missing`, () =>
        HttpResponse.json(
          { title: 'Widget not found', status: 404, detail: 'No widget with that id.' },
          { status: 404 },
        ),
      ),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client
      .get('/widgets/missing', ignoreBody)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('notFound')
    expect((error as AppError).message).toBe('Widget not found')
  })

  it('maps a 400 without a structured errors map to validation, preserving the detail as the message', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/detail-only`, () =>
        HttpResponse.json({ detail: 'Only a detail here.' }, { status: 400 }),
      ),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client
      .get('/widgets/detail-only', ignoreBody)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('validation')
    expect((error as AppError).message).toBe('Only a detail here.')
  })

  it('maps an unrecognized 5xx status to a curated unexpected AppError, not the raw statusText', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/empty-body`, () => new HttpResponse(null, { status: 500 })),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client
      .get('/widgets/empty-body', ignoreBody)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unexpected')
    // The raw "Internal Server Error" statusText must never reach the user
    // directly - only the curated pt-BR message does.
    expect((error as AppError).message).not.toBe('Internal Server Error')
    expect((error as AppError).message).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })

  it('maps a 401 response to an unauthenticated AppError', async () => {
    server.use(http.get(`${baseUrl}/widgets/1`, () => HttpResponse.json({}, { status: 401 })))

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client.get('/widgets/1', ignoreBody).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unauthenticated')
  })

  it('maps a fetch-level network failure to a network AppError', async () => {
    server.use(http.get(`${baseUrl}/widgets/1`, () => HttpResponse.error()))

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client.get('/widgets/1', ignoreBody).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('network')
    expect((error as AppError).retryable).toBe(true)
  })

  it('maps a request-timeout abort to a timeout AppError', async () => {
    // AbortSignal.timeout() firing for real would need a 15s wait - stub
    // fetch directly to simulate the exact DOMException it produces instead.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'))

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client.get('/widgets/1', ignoreBody).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('timeout')
    expect((error as AppError).retryable).toBe(true)

    fetchSpy.mockRestore()
  })

  it('notifies the session invalidation notifier on a 401 response', async () => {
    server.use(http.get(`${baseUrl}/widgets/1`, () => HttpResponse.json({}, { status: 401 })))

    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'), {
      notifyUnauthenticated,
    })

    await client.get('/widgets/1', ignoreBody).catch(() => undefined)

    expect(notifyUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('does not notify session invalidation on a non-401 error response', async () => {
    server.use(http.get(`${baseUrl}/widgets/missing`, () => HttpResponse.json({}, { status: 404 })))

    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'), {
      notifyUnauthenticated,
    })

    await client.get('/widgets/missing', ignoreBody).catch(() => undefined)

    expect(notifyUnauthenticated).not.toHaveBeenCalled()
  })

  it('resolves to undefined for a 204 response on delete', async () => {
    server.use(http.delete(`${baseUrl}/widgets/1`, () => new HttpResponse(null, { status: 204 })))

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    await expect(client.delete('/widgets/1')).resolves.toBeUndefined()
  })

  it('produces a curated AppError, not the raw decode failure, when the decoder rejects the payload', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/malformed`, () =>
        HttpResponse.json({ id: '1' /* missing name */ }),
      ),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client
      .get('/widgets/malformed', decodeWidget)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unexpected')
    expect((error as AppError).message).toBe('Ocorreu um erro inesperado. Tente novamente.')
  })

  it('produces a curated AppError, not a raw SyntaxError, for a 2xx response with an unparsable body', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/not-json`, () => new HttpResponse('not json', { status: 200 })),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))

    const error = await client
      .get('/widgets/not-json', decodeWidget)
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unexpected')
  })

  it('passes undefined to the decoder for a 204 response on get/post/put, never a bare `undefined as T`', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/no-content`, () => new HttpResponse(null, { status: 204 })),
    )

    const client = new AuthenticatedHttpClient(baseUrl, withSession('token-123'))
    const decodeSpy = vi.fn((payload: unknown) => payload)

    await client.get('/widgets/no-content', decodeSpy)

    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith(undefined)
  })
})
