// Public API of the catalog feature (ADR 009) - the only path other features
// and app/ may import catalog internals through. CategoriesPage is
// deliberately NOT re-exported here: app/routes/router.tsx lazy-loads it
// by its own module path so Vite keeps it on its own chunk - importing
// it through this barrel would bundle it with other pages and defeat that
// code-splitting.

export type { CategoryRepository } from './application/repositories/CategoryRepository'

// Composition-root-only wiring (docs/adr/008) - not for use outside app/composition.
export { ApiCategoryRepository } from './infrastructure/repositories/ApiCategoryRepository'
