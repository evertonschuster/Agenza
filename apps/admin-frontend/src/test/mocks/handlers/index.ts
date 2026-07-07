import type { RequestHandler } from 'msw'

// Handlers are added incrementally, one resource at a time, as each
// infrastructure-layer repository is built (auth first). Keeping this
// empty until real handlers exist avoids inventing API shapes we haven't
// confirmed yet.
export const handlers: RequestHandler[] = []
