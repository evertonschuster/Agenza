import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { CallbackPage } from '@/features/auth/presentation/CallbackPage/CallbackPage'
import { AuthProvider } from '@/features/auth/presentation/AuthProvider'
import { ProtectedRoute } from '@/features/auth/presentation/ProtectedRoute'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { HandleAuthCallback } from '@/features/auth/application/use-cases/HandleAuthCallback'
import { createFakeAuthRepository } from '@/features/auth/application/test-helpers/createFakeAuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import type { AppContainer } from '@/app/composition/container'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import type { CompletedAuthCallback } from '@/features/auth/application/use-cases/HandleAuthCallback'
import { vi } from 'vitest'

const fakeTenantContext: TenantContext = {
  tenant: Tenant.create('tenant-123'),
  user: User.create({ id: 'user-1', tenant: Tenant.create('tenant-123') }),
}
const dashboardCallbackResult: CompletedAuthCallback = {
  tenantContext: fakeTenantContext,
  returnTo: '/dashboard',
}

function buildContainer(
  handleCallbackFn: (url: string) => Promise<CompletedAuthCallback>,
): AppContainer {
  return createFakeAppContainer({ auth: { handleAuthCallback: { execute: handleCallbackFn } } })
}

function renderCallbackPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/callback']}>
          <Routes>
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
            <Route path="/services" element={<div>Services page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('CallbackPage', () => {
  it('shows a processing state while the callback is being handled', () => {
    // never resolves — simulates an in-flight token exchange
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const handleCallback = vi.fn(() => new Promise<CompletedAuthCallback>(() => {}))
    renderCallbackPage(buildContainer(handleCallback))

    expect(screen.getByText(/concluindo login/i)).toBeInTheDocument()
  })

  it('passes the full current URL to the callback use case', async () => {
    const handleCallback = vi.fn(() => Promise.resolve(dashboardCallbackResult))
    renderCallbackPage(buildContainer(handleCallback))

    await screen.findByText('Dashboard page')

    expect(handleCallback).toHaveBeenCalledExactlyOnceWith(window.location.href)
  })

  it('navigates to the dashboard when the callback succeeds', async () => {
    renderCallbackPage(buildContainer(vi.fn(() => Promise.resolve(dashboardCallbackResult))))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('returns to the protected page carried through the login flow', async () => {
    renderCallbackPage(
      buildContainer(
        vi.fn(() =>
          Promise.resolve({
            tenantContext: fakeTenantContext,
            returnTo: '/services?search=massagem#editor',
          }),
        ),
      ),
    )

    expect(await screen.findByText('Services page')).toBeInTheDocument()
  })

  it('updates the shared auth session before entering a protected route', async () => {
    const container = buildContainer(vi.fn(() => Promise.resolve(dashboardCallbackResult)))

    render(
      <AppContainerContext.Provider value={container}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/callback']}>
            <Routes>
              <Route path="/callback" element={<CallbackPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Dashboard page</div>} />
              </Route>
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </AppContainerContext.Provider>,
    )

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('shows the error state with a way back to login when the callback fails', async () => {
    renderCallbackPage(buildContainer(vi.fn(() => Promise.reject(new Error('exchange failed')))))

    expect(await screen.findByText(/falha no login/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('exchanges the authorization code only once under React.StrictMode', async () => {
    // Uses the real HandleAuthCallback (not a bare spy) so its own
    // single-flight/idempotency caching is exercised end to end - a naive
    // component-local guard would not protect a genuinely separate
    // AuthRepository call the way this use case's URL-keyed cache does.
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    let handleCallbackCount = 0
    const authRepository = createFakeAuthRepository({
      handleCallback: () => {
        handleCallbackCount += 1
        return Promise.resolve({ session, returnTo: null })
      },
    })
    const container = createFakeAppContainer({
      auth: { handleAuthCallback: new HandleAuthCallback(authRepository) },
    })

    render(
      <StrictMode>
        <AppContainerContext.Provider value={container}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/callback']}>
              <Routes>
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/dashboard" element={<div>Dashboard page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </AppContainerContext.Provider>
      </StrictMode>,
    )

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(handleCallbackCount).toBe(1)
  })
})
