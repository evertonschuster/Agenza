import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/mocks/server'
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient'
import { ApiError } from './ApiError'
import { UnauthenticatedError } from './UnauthenticatedError'

const baseUrl = 'https://api.test'

describe('AuthenticatedHttpClient', () => {
  it('attaches the bearer token and returns the parsed JSON body', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/1`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer token-123')
        return HttpResponse.json({ id: '1', name: 'Widget' })
      }),
    )

    const client = new AuthenticatedHttpClient(baseUrl, () => Promise.resolve('token-123'))

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

    const client = new AuthenticatedHttpClient(baseUrl, () => Promise.resolve('token-123'))

    const result = await client.post<{ id: string; name: string }>('/widgets', { name: 'Widget' })

    expect(result).toEqual({ id: '1', name: 'Widget' })
  })

  it('throws UnauthenticatedError instead of making a request when there is no access token', async () => {
    const client = new AuthenticatedHttpClient(baseUrl, () => Promise.resolve(null))

    await expect(client.get('/widgets/1')).rejects.toThrow(UnauthenticatedError)
  })

  it('throws ApiError with the status and message on a non-2xx response', async () => {
    server.use(
      http.get(`${baseUrl}/widgets/missing`, () =>
        HttpResponse.json({ error: 'not_found', message: 'Widget not found' }, { status: 404 }),
      ),
    )

    const client = new AuthenticatedHttpClient(baseUrl, () => Promise.resolve('token-123'))

    const error = await client.get('/widgets/missing').catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).toBe('Widget not found')
  })

  it('resolves to undefined for a 204 response on delete', async () => {
    server.use(http.delete(`${baseUrl}/widgets/1`, () => new HttpResponse(null, { status: 204 })))

    const client = new AuthenticatedHttpClient(baseUrl, () => Promise.resolve('token-123'))

    await expect(client.delete('/widgets/1')).resolves.toBeUndefined()
  })
})
