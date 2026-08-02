// Public API of the catalog feature (ADR 009) - the only path other features
// and app/ may import catalog internals through. TagsPage/CategoriesPage are
// deliberately NOT re-exported here: app/routes/router.tsx lazy-loads them
// by their own module path so Vite keeps each on its own chunk - importing
// them through this barrel would bundle them together and defeat that
// code-splitting.

export type { TagRepository } from './application/repositories/TagRepository'
export type { CategoryRepository } from './application/repositories/CategoryRepository'

// Composition-root-only wiring (docs/adr/008) - not for use outside app/composition.
export { ApiTagRepository } from './infrastructure/repositories/ApiTagRepository'
export { ApiCategoryRepository } from './infrastructure/repositories/ApiCategoryRepository'
