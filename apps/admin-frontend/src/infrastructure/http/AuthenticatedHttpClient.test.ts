import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/mocks/server'
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient'
import { AppError } from '../../application/errors/AppError'

const baseUrl = 'https://api.test'

describe('AuthenticatedHttpClient', () => {
  it('attaches the bearer token and returns the parsed JSON body', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer token-123')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const result = await client.get<{ id: string; name: string }>('/widgets/1')

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

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const result = await client.post<{ id: string; name: string }>('/widgets', { name: 'Widget' })

    expect(result).toEqual({ id: '1', name: 'Widget' })
  })

  it('throws an unauthenticated AppError instead of making a request when there is no access token', async () => {
    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve(null),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/1').catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unauthenticated')
  })

  it('notifies the session invalidation notifier when there is no access token', async () => {
    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve(null),
      () => Promise.resolve('tenant-abc'),
      { notifyUnauthenticated },
    )

    await client.get('/widgets/1').catch(() => undefined)

    expect(notifyUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('attaches the X-Tenant-Id header when a tenant is known', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('X-Tenant-Id')).toBe('tenant-abc')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    await client.get('/widgets/1')
  })

  it('omits the X-Tenant-Id header when no tenant is known', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.has('X-Tenant-Id')).toBe(false)
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve(null),
    )

    await client.get('/widgets/1')
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

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/missing').catch((thrown: unknown) => thrown)

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

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/detail-only').catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('validation')
    expect((error as AppError).message).toBe('Only a detail here.')
  })

  it('maps an unrecognized 5xx status to a curated unexpected AppError, not the raw statusText', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/empty-body`, () => new HttpResponse(null, { status: 500 })),
    )

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/empty-body').catch((thrown: unknown) => thrown)

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

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/1').catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('unauthenticated')
  })

  it('maps a fetch-level network failure to a network AppError', async () => {
    server.use(http.get(`${baseUrl}/widgets/1`, () => HttpResponse.error()))

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/1').catch((thrown: unknown) => thrown)

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

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    const error = await client.get('/widgets/1').catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('timeout')
    expect((error as AppError).retryable).toBe(true)

    fetchSpy.mockRestore()
  })

  it('notifies the session invalidation notifier on a 401 response', async () => {
    server.use(http.get(`${baseUrl}/widgets/1`, () => HttpResponse.json({}, { status: 401 })))

    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
      { notifyUnauthenticated },
    )

    await client.get('/widgets/1').catch(() => undefined)

    expect(notifyUnauthenticated).toHaveBeenCalledTimes(1)
  })

  it('does not notify session invalidation on a non-401 error response', async () => {
    server.use(http.get(`${baseUrl}/widgets/missing`, () => HttpResponse.json({}, { status: 404 })))

    const notifyUnauthenticated = vi.fn()
    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
      { notifyUnauthenticated },
    )

    await client.get('/widgets/missing').catch(() => undefined)

    expect(notifyUnauthenticated).not.toHaveBeenCalled()
  })

  it('resolves to undefined for a 204 response on delete', async () => {
    server.use(http.delete(`${baseUrl}/widgets/1`, () => new HttpResponse(null, { status: 204 })))

    const client = new AuthenticatedHttpClient(
      baseUrl,
      () => Promise.resolve('token-123'),
      () => Promise.resolve('tenant-abc'),
    )

    await expect(client.delete('/widgets/1')).resolves.toBeUndefined()
  })
})
