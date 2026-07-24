import { http, HttpResponse } from 'msw'
import type { ServiceDto } from '@/features/catalog/infrastructure/mappers/serviceMapper'

const API_BASE_URL = 'https://api.test'

export const serviceFixture: ServiceDto = {
  id: 'service-1',
  code: 1001,
  name: 'Massagem relaxante',
  description: 'Uma massagem relaxante de corpo inteiro',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
  categoryId: 'category-1',
  categoryName: 'Massagens',
  tags: [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }],
}

/** Backing dataset for the paginated GET handler below - a single entry by default. */
export const serviceFixtures: ServiceDto[] = [serviceFixture]

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

/** Default happy-path handlers for /api/v1/services - override per-test with server.use(). */
export const serviceHandlers = [
  http.get(`${API_BASE_URL}/api/v1/services`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? DEFAULT_PAGE)
    const pageSize = Number(url.searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE)
    const start = (page - 1) * pageSize
    const items = serviceFixtures.slice(start, start + pageSize)
    return HttpResponse.json({
      items,
      totalCount: serviceFixtures.length,
      page,
      pageSize,
    })
  }),

  http.post(`${API_BASE_URL}/api/v1/services`, () =>
    HttpResponse.json(serviceFixture, {
      status: 201,
      headers: { Location: `/api/v1/services/${serviceFixture.id}` },
    }),
  ),

  http.put(`${API_BASE_URL}/api/v1/services/:id`, () => HttpResponse.json(serviceFixture)),

  http.delete(`${API_BASE_URL}/api/v1/services/:id`, () => new HttpResponse(null, { status: 204 })),
]
