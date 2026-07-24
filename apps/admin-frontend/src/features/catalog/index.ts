// Public API of the catalog feature (ADR 009) - the only path other features
// and app/ may import catalog internals through. TagsPage/CategoriesPage/
// ServicesPage are deliberately NOT re-exported here: app/routes/router.tsx
// lazy-loads them by their own module path so Vite keeps each on its own
// chunk - importing them through this barrel would bundle all three
// together and defeat that code-splitting.

export type { TagRepository } from './application/repositories/TagRepository'
export type { CategoryRepository } from './application/repositories/CategoryRepository'
export type { ServiceRepository } from './application/repositories/ServiceRepository'

export { ListTags } from './application/use-cases/tags/ListTags'
export { CreateTag } from './application/use-cases/tags/CreateTag'
export { UpdateTag } from './application/use-cases/tags/UpdateTag'
export { DeleteTag } from './application/use-cases/tags/DeleteTag'
export { ListCategories } from './application/use-cases/categories/ListCategories'
export { CreateCategory } from './application/use-cases/categories/CreateCategory'
export { UpdateCategory } from './application/use-cases/categories/UpdateCategory'
export { DeleteCategory } from './application/use-cases/categories/DeleteCategory'
export { ListServices } from './application/use-cases/services/ListServices'
export { CreateService } from './application/use-cases/services/CreateService'
export { UpdateService } from './application/use-cases/services/UpdateService'
export { DeleteService } from './application/use-cases/services/DeleteService'

// Composition-root-only wiring (docs/adr/008) - not for use outside app/composition.
export { ApiTagRepository } from './infrastructure/repositories/ApiTagRepository'
export { ApiCategoryRepository } from './infrastructure/repositories/ApiCategoryRepository'
export { ApiServiceRepository } from './infrastructure/repositories/ApiServiceRepository'
