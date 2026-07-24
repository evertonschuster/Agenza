import type { RequestHandler } from 'msw'
import { tagHandlers } from '@/test/mocks/handlers/tagHandlers'
import { categoryHandlers } from '@/test/mocks/handlers/categoryHandlers'
import { serviceHandlers } from '@/test/mocks/handlers/serviceHandlers'

// Handlers are added incrementally, one resource at a time, as each
// infrastructure-layer repository is built.
export const handlers: RequestHandler[] = [...tagHandlers, ...categoryHandlers, ...serviceHandlers]
