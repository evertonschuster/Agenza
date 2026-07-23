import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAppContainer } from './container'
import { InMemorySessionEventBus } from '../infrastructure/auth/InMemorySessionEventBus'
import { InitiateLogin } from '../application/use-cases/auth/InitiateLogin'
import { HandleAuthCallback } from '../application/use-cases/auth/HandleAuthCallback'
import { GetCurrentSession } from '../application/use-cases/auth/GetCurrentSession'
import { Logout } from '../application/use-cases/auth/Logout'
import { ListTags } from '../application/use-cases/tags/ListTags'
import { toTenantContext } from '../application/context/TenantContext'
import { Tenant } from '../domain/value-objects/Tenant'
import { User } from '../domain/entities/User'

function stubOidcEnv(): void {
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example.com')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://app.example.com/callback')
  vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'https://app.example.com/login')
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id')
}

describe('createAppContainer', () => {
  beforeEach(() => {
    stubOidcEnv()
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('wires the auth facade from concrete use cases', () => {
    const container = createAppContainer()

    expect(container.auth.initiateLogin).toBeInstanceOf(InitiateLogin)
    expect(container.auth.handleAuthCallback).toBeInstanceOf(HandleAuthCallback)
    expect(container.auth.getCurrentSession).toBeInstanceOf(GetCurrentSession)
    expect(container.auth.logout).toBeInstanceOf(Logout)
    expect(container.auth.sessionEvents).toBeInstanceOf(InMemorySessionEventBus)
  })

  it('wires the catalog facade from concrete use cases', () => {
    const container = createAppContainer()

    expect(container.catalog.listTags).toBeInstanceOf(ListTags)
  })

  it('does not expose a repository or an HttpClient on the container', () => {
    const container = createAppContainer()

    // The public AppContainer type has no such fields at all - this also
    // guards against a future change accidentally re-adding one.
    expect(container).not.toHaveProperty('httpClient')
    expect(container).not.toHaveProperty('authRepository')
    expect(container).not.toHaveProperty('tagRepository')
  })

  it('wires the same sessionEvents instance into the http client, so a 401/no-token reaches subscribers', async () => {
    const container = createAppContainer()
    const listener = vi.fn()
    container.auth.sessionEvents.subscribe(listener)

    const tenant = Tenant.create('tenant-1')
    const tenantContext = toTenantContext(User.create({ id: 'user-1', tenant }))

    // No stored OIDC session in this test environment, so this call has no
    // access token - it goes through the private httpClient built with this
    // exact sessionEvents instance as its notifier, proving they're wired
    // together end to end rather than just both present on the container.
    await container.catalog.listTags.execute(tenantContext, {}).catch(() => undefined)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('fails fast when VITE_API_BASE_URL is missing', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    expect(() => createAppContainer()).toThrow(/VITE_API_BASE_URL/)
  })
})
