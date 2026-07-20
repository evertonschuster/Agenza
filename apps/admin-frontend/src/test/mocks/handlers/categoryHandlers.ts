import { http, HttpResponse } from 'msw'
import type { CategoryDto } from '../../../infrastructure/mappers/categoryMapper'

const API_BASE_URL = 'https://api.test'

export const categoryFixture: CategoryDto = {
  id: 'category-1',
  name: 'Massagens',
}

/** Default happy-path handlers for /api/v1/categories - override per-test with server.use(). */
export const categoryHandlers = [
  http.get(`${API_BASE_URL}/api/v1/categories`, () => HttpResponse.json([categoryFixture])),

  http.post(`${API_BASE_URL}/api/v1/categories`, () =>
    HttpResponse.json(categoryFixture, {
      status: 201,
      headers: { Location: `/api/v1/categories/${categoryFixture.id}` },
    }),
  ),

  http.put(`${API_BASE_URL}/api/v1/categories/:id`, () => HttpResponse.json(categoryFixture)),

  http.delete(
    `${API_BASE_URL}/api/v1/categories/:id`,
    () => new HttpResponse(null, { status: 204 }),
  ),
]
