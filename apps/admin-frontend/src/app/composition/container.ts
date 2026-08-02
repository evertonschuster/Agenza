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
import { ApiCategoryRepository, type CategoryRepository } from '@/features/catalog'

// Each entry is the *shape* of a use case (Pick<Class, 'execute'>), not the
// concrete class - makes a plain `{ execute: vi.fn(...) }` a valid, fully
// typed test fake with no cast needed (src/test/fixtures/createFakeAppContainer.ts).
export interface AuthFacade {
  initiateLogin: Pick<InitiateLogin, 'execute'>
  handleAuthCallback: Pick<HandleAuthCallback, 'execute'>
  getCurrentSession: Pick<GetCurrentSession, 'execute'>
  logout: Pick<Logout, 'execute'>
  /** AuthProvider subscribes here to clear the session on a 401 (docs/adr/006). */
  sessionEvents: SessionEventBus
}

/** Each entry's execute signature mirrors the matching repository method
 * directly - there's no orchestration between the facade and the repository,
 * so no intermediate use-case class is worth the indirection. */
export interface CatalogFacade {
  listCategories: { execute: CategoryRepository['listAll'] }
  getCategory: { execute: CategoryRepository['getById'] }
  createCategory: { execute: CategoryRepository['create'] }
  updateCategory: { execute: CategoryRepository['update'] }
  deleteCategory: { execute: CategoryRepository['delete'] }
}

// What presentation is allowed to see - grouped facades, never a raw
// repository or HttpClient, by construction (docs/adr/008).
export interface AppContainer {
  auth: AuthFacade
  catalog: CatalogFacade
}

// The one place outside infrastructure/ allowed to know OidcAuthRepository,
// AuthenticatedHttpClient, or any Api*Repository exists.
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

  const categoryRepository: CategoryRepository = new ApiCategoryRepository(httpClient)

  return {
    auth: {
      initiateLogin: new InitiateLogin(authRepository),
      handleAuthCallback: new HandleAuthCallback(authRepository),
      getCurrentSession: new GetCurrentSession(authRepository),
      logout: new Logout(authRepository),
      sessionEvents,
    },
    catalog: {
      listCategories: { execute: options => categoryRepository.listAll(options) },
      getCategory: { execute: id => categoryRepository.getById(id) },
      createCategory: { execute: input => categoryRepository.create(input) },
      updateCategory: { execute: (id, input) => categoryRepository.update(id, input) },
      deleteCategory: { execute: id => categoryRepository.delete(id) },
    },
  }
}
