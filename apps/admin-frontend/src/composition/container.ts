import { createUserManager } from '../infrastructure/config/createUserManager'
import { OidcAuthRepository } from '../infrastructure/auth/OidcAuthRepository'
import { InMemorySessionEventBus } from '../infrastructure/auth/InMemorySessionEventBus'
import { AuthenticatedHttpClient } from '../infrastructure/http/AuthenticatedHttpClient'
import { ApiTagRepository } from '../infrastructure/repositories/ApiTagRepository'
import { ApiCategoryRepository } from '../infrastructure/repositories/ApiCategoryRepository'
import { ApiServiceRepository } from '../infrastructure/repositories/ApiServiceRepository'
import type { AuthRepository } from '../application/repositories/AuthRepository'
import type { HttpClient } from '../application/ports/HttpClient'
import type { SessionEventBus } from '../application/ports/SessionEventBus'
import type { TagRepository } from '../application/repositories/TagRepository'
import type { CategoryRepository } from '../application/repositories/CategoryRepository'
import type { ServiceRepository } from '../application/repositories/ServiceRepository'
import { InitiateLogin } from '../application/use-cases/auth/InitiateLogin'
import { HandleAuthCallback } from '../application/use-cases/auth/HandleAuthCallback'
import { GetCurrentSession } from '../application/use-cases/auth/GetCurrentSession'
import { Logout } from '../application/use-cases/auth/Logout'
import { ListTags } from '../application/use-cases/tags/ListTags'
import { CreateTag } from '../application/use-cases/tags/CreateTag'
import { UpdateTag } from '../application/use-cases/tags/UpdateTag'
import { DeleteTag } from '../application/use-cases/tags/DeleteTag'
import { ListCategories } from '../application/use-cases/categories/ListCategories'
import { CreateCategory } from '../application/use-cases/categories/CreateCategory'
import { UpdateCategory } from '../application/use-cases/categories/UpdateCategory'
import { DeleteCategory } from '../application/use-cases/categories/DeleteCategory'
import { ListServices } from '../application/use-cases/services/ListServices'
import { CreateService } from '../application/use-cases/services/CreateService'
import { UpdateService } from '../application/use-cases/services/UpdateService'
import { DeleteService } from '../application/use-cases/services/DeleteService'

/**
 * What presentation depends on for auth - each entry is the *shape* of a
 * use case (via Pick<Class, 'execute'>, which is structural and drops the
 * class's private-field nominal typing), not the concrete class itself.
 * This is what makes a plain `{ execute: vi.fn(...) }` object a valid,
 * fully-typed test fake with no `as unknown as AppContainer` cast needed -
 * see src/test/fixtures/createFakeAppContainer.ts.
 */
export interface AuthFacade {
  initiateLogin: Pick<InitiateLogin, 'execute'>
  handleAuthCallback: Pick<HandleAuthCallback, 'execute'>
  getCurrentSession: Pick<GetCurrentSession, 'execute'>
  logout: Pick<Logout, 'execute'>
  /** AuthProvider subscribes here to clear the session on a 401 (docs/adr/006). */
  sessionEvents: SessionEventBus
}

/** Tags, Categories, and Services collaborate in the same business context. */
export interface CatalogFacade {
  listTags: Pick<ListTags, 'execute'>
  createTag: Pick<CreateTag, 'execute'>
  updateTag: Pick<UpdateTag, 'execute'>
  deleteTag: Pick<DeleteTag, 'execute'>
  listCategories: Pick<ListCategories, 'execute'>
  createCategory: Pick<CreateCategory, 'execute'>
  updateCategory: Pick<UpdateCategory, 'execute'>
  deleteCategory: Pick<DeleteCategory, 'execute'>
  listServices: Pick<ListServices, 'execute'>
  createService: Pick<CreateService, 'execute'>
  updateService: Pick<UpdateService, 'execute'>
  deleteService: Pick<DeleteService, 'execute'>
}

/**
 * What presentation is allowed to see - grouped application facades, never
 * a raw repository or HttpClient (those stay local to createAppContainer,
 * below). Presentation reaches a use case through `auth`/`catalog`; it has
 * no way to reach `AuthenticatedHttpClient`, `OidcAuthRepository`, or any
 * `Api*Repository` at all, by construction (docs/adr/008).
 */
export interface AppContainer {
  auth: AuthFacade
  catalog: CatalogFacade
}

/**
 * Builds the application's dependency graph. This is the one place outside
 * of infrastructure/ itself that is allowed to know OidcAuthRepository,
 * AuthenticatedHttpClient, or any Api*Repository exists - everywhere else
 * (hooks, components) depends only on the auth/catalog facades returned
 * below.
 *
 * Takes no parameters and reads no config directly: createUserManager
 * already isolates environment variable access, so swapping how
 * configuration is sourced never requires touching this file.
 */
export function createAppContainer(): AppContainer {
  const userManager = createUserManager()
  const authRepository: AuthRepository = new OidcAuthRepository(userManager)
  const sessionEvents: SessionEventBus = new InMemorySessionEventBus()

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not set. Check your .env.local (see .env.example).')
  }

  const httpClient: HttpClient = new AuthenticatedHttpClient(
    apiBaseUrl,
    async () => {
      const session = await authRepository.getCurrentSession()
      return session?.accessToken ?? null
    },
    async () => {
      const session = await authRepository.getCurrentSession()
      return session?.user.tenant.id ?? null
    },
    sessionEvents,
  )

  const tagRepository: TagRepository = new ApiTagRepository(httpClient)
  const categoryRepository: CategoryRepository = new ApiCategoryRepository(httpClient)
  const serviceRepository: ServiceRepository = new ApiServiceRepository(httpClient)

  return {
    auth: {
      initiateLogin: new InitiateLogin(authRepository),
      handleAuthCallback: new HandleAuthCallback(authRepository),
      getCurrentSession: new GetCurrentSession(authRepository),
      logout: new Logout(authRepository),
      sessionEvents,
    },
    catalog: {
      listTags: new ListTags(tagRepository),
      createTag: new CreateTag(tagRepository),
      updateTag: new UpdateTag(tagRepository),
      deleteTag: new DeleteTag(tagRepository),
      listCategories: new ListCategories(categoryRepository),
      createCategory: new CreateCategory(categoryRepository),
      updateCategory: new UpdateCategory(categoryRepository),
      deleteCategory: new DeleteCategory(categoryRepository),
      listServices: new ListServices(serviceRepository),
      createService: new CreateService(serviceRepository),
      updateService: new UpdateService(serviceRepository),
      deleteService: new DeleteService(serviceRepository),
    },
  }
}
