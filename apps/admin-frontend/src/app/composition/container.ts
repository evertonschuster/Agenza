import { InMemorySessionEventBus } from '@/shared/infrastructure/InMemorySessionEventBus'
import { AuthenticatedHttpClient } from '@/shared/infrastructure/http/AuthenticatedHttpClient'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { SessionEventBus } from '@/shared/application/SessionEventBus'
import type { GetRequestSession } from '@/shared/application/RequestSession'
import {
  createUserManager,
  OidcAuthRepository,
  type AuthRepository,
  InitiateLogin,
  HandleAuthCallback,
  GetCurrentSession,
  Logout,
} from '@/features/auth'
import {
  ApiTagRepository,
  ApiCategoryRepository,
  ApiServiceRepository,
  type TagRepository,
  type CategoryRepository,
  type ServiceRepository,
  ListTags,
  CreateTag,
  UpdateTag,
  DeleteTag,
  ListCategories,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListServices,
  CreateService,
  UpdateService,
  DeleteService,
} from '@/features/catalog'

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

  const getRequestSession: GetRequestSession = async () => {
    const session = await authRepository.getCurrentSession()
    return session === null
      ? null
      : { accessToken: session.accessToken, tenantId: session.user.tenant.id }
  }

  const httpClient: HttpClient = new AuthenticatedHttpClient(
    apiBaseUrl,
    getRequestSession,
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
