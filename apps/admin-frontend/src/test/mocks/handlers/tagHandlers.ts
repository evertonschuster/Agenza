import { http, HttpResponse } from 'msw'
import type { TagDto } from '../../../infrastructure/mappers/tagMapper'

const API_BASE_URL = 'https://api.test'

export const tagFixture: TagDto = {
  id: 'tag-1',
  name: 'VIP',
  color: '#0d9488',
  description: 'High-value client',
}

/** Default happy-path handlers for /api/tags - override per-test with server.use(). */
export const tagHandlers = [
  http.get(`${API_BASE_URL}/api/tags`, () => HttpResponse.json([tagFixture])),

  http.post(`${API_BASE_URL}/api/tags`, () =>
    HttpResponse.json(tagFixture, {
      status: 201,
      headers: { Location: `/api/tags/${tagFixture.id}` },
    }),
  ),

  http.put(`${API_BASE_URL}/api/tags/:id`, () => HttpResponse.json(tagFixture)),

  http.delete(`${API_BASE_URL}/api/tags/:id`, () => new HttpResponse(null, { status: 204 })),
]
