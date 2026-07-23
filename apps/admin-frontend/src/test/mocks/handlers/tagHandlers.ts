import { http, HttpResponse } from 'msw'
import type { TagDto } from '@/features/catalog/infrastructure/mappers/tagMapper'

const API_BASE_URL = 'https://api.test'

export const tagFixture: TagDto = {
  id: 'tag-1',
  name: 'VIP',
  color: '#0d9488',
  description: 'High-value client',
}

/** Default happy-path handlers for /api/v1/tags - override per-test with server.use(). */
export const tagHandlers = [
  http.get(`${API_BASE_URL}/api/v1/tags`, () => HttpResponse.json([tagFixture])),

  http.post(`${API_BASE_URL}/api/v1/tags`, () =>
    HttpResponse.json(tagFixture, {
      status: 201,
      headers: { Location: `/api/v1/tags/${tagFixture.id}` },
    }),
  ),

  http.put(`${API_BASE_URL}/api/v1/tags/:id`, () => HttpResponse.json(tagFixture)),

  http.delete(`${API_BASE_URL}/api/v1/tags/:id`, () => new HttpResponse(null, { status: 204 })),
]
