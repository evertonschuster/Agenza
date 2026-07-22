import type { RequestHandler } from 'msw'
import { tagHandlers } from './tagHandlers'
import { categoryHandlers } from './categoryHandlers'
import { serviceHandlers } from './serviceHandlers'

// Handlers are added incrementally, one resource at a time, as each
// infrastructure-layer repository is built.
export const handlers: RequestHandler[] = [...tagHandlers, ...categoryHandlers, ...serviceHandlers]
