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
import { Session, Tenant, User } from '@/test/fixtures/authEntityFixtures'
import type { AppContainer } from '@/app/composition/container'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import type { CompletedAuthCallback } from '@/features/auth/application/use-cases/HandleAuthCallback'
import { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import { success, failure, type Result } from '@/shared/application/Result'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'

const fakeTenantContext: TenantContext = {
  tenant: Tenant.create('tenant-123'),
  user: User.create({ id: 'user-1', tenant: Tenant.create('tenant-123') }),
}
const dashboardCallbackResult: CompletedAuthCallback = {
  tenantContext: fakeTenantContext,
  returnTo: '/dashboard',
}

function buildContainer(
  handleCallbackFn: (url: string) => Promise<Result<CompletedAuthCallback, AuthFlowError>>,
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
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('CallbackPage', () => {
  it('shows a processing state while the callback is being handled', () => {
    // never resolves — simulates an in-flight token exchange
    const handleCallback = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return new Promise<Result<CompletedAuthCallback, AuthFlowError>>(() => {})
    })
    renderCallbackPage(buildContainer(handleCallback))

    expect(screen.getByRole('heading', { name: /concluindo seu login/i })).toBeInTheDocument()
    expect(
      screen.getByText(/voltará automaticamente para a página em que estava/i),
    ).toBeInTheDocument()
  })

  it('passes the full current URL to the callback use case', async () => {
    const handleCallback = vi.fn(() => Promise.resolve(success(dashboardCallbackResult)))
    renderCallbackPage(buildContainer(handleCallback))

    await screen.findByText('Dashboard page')

    expect(handleCallback).toHaveBeenCalledExactlyOnceWith(window.location.href)
  })

  it('navigates to the dashboard when the callback succeeds', async () => {
    renderCallbackPage(
      buildContainer(vi.fn(() => Promise.resolve(success(dashboardCallbackResult)))),
    )

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('returns to the protected page carried through the login flow', async () => {
    renderCallbackPage(
      buildContainer(
        vi.fn(() =>
          Promise.resolve(
            success({
              tenantContext: fakeTenantContext,
              returnTo: '/services?search=massagem#editor',
            }),
          ),
        ),
      ),
    )

    expect(await screen.findByText('Services page')).toBeInTheDocument()
  })

  it('updates the shared auth session before entering a protected route', async () => {
    const container = buildContainer(vi.fn(() => Promise.resolve(success(dashboardCallbackResult))))

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

  it('shows a specific error, support code, and a new-login action when callback fails', async () => {
    renderCallbackPage(
      buildContainer(
        vi.fn(() =>
          Promise.resolve(
            failure(
              new AuthFlowError({
                code: 'unauthenticated',
                flowCode: 'AUTH_ATTEMPT_EXPIRED',
                message:
                  'Esta tentativa de login expirou ou já foi utilizada. Inicie uma nova tentativa para entrar.',
                retryable: true,
              }),
            ),
          ),
        ),
      ),
    )

    expect(
      await screen.findByRole('heading', { name: /tentativa de login expirada/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('AUTH_ATTEMPT_EXPIRED')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /iniciar um novo login/i }))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
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
        return Promise.resolve(success({ session, returnTo: null }))
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
