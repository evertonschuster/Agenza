import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import type { AppContainer } from '@/app/composition/container'
import { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import { Tenant, User } from '@/test/fixtures/authEntityFixtures'
import { AuthProvider } from '@/features/auth/presentation/AuthProvider'
import { LoginPage } from '@/features/auth/presentation/LoginPage/LoginPage'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import { ThemeProvider } from '@/shared/presentation/providers/ThemeProvider'
import { success, failure, type Result } from '@/shared/application/Result'

function buildContainer(
  loginFn: () => Promise<Result<void, AuthFlowError>> = vi.fn(() =>
    Promise.resolve(success(undefined)),
  ),
  getCurrentSessionFn: () => Promise<TenantContext | null> = () => Promise.resolve(null),
): AppContainer {
  return createFakeAppContainer({
    auth: {
      initiateLogin: { execute: loginFn },
      getCurrentSession: { execute: vi.fn(getCurrentSessionFn) },
    },
  })
}

function renderLoginPage(
  container: AppContainer,
  options: { returnTo?: string; strict?: boolean; theme?: 'light' | 'dark' } = {},
): HTMLElement {
  localStorage.setItem('admin-theme', options.theme ?? 'light')

  const routes = (
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter
            initialEntries={
              options.returnTo === undefined
                ? ['/login']
                : [{ pathname: '/login', state: { returnTo: options.returnTo } }]
            }
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<div>Dashboard page</div>} />
              <Route path="/services" element={<div>Services page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    </AppContainerContext.Provider>
  )

  return render(options.strict === true ? <StrictMode>{routes}</StrictMode> : routes).container
}

describe('LoginPage', () => {
  it('explains the session check before starting the redirect', () => {
    const neverResolves = (): Promise<TenantContext | null> =>
      new Promise<TenantContext | null>(() => undefined)

    renderLoginPage(
      buildContainer(
        vi.fn(() => Promise.resolve(success(undefined))),
        neverResolves,
      ),
    )

    expect(screen.getByRole('heading', { name: /verificando sua sessão/i })).toBeInTheDocument()
    expect(screen.getByText(/redirecionamento automático em andamento/i)).toBeInTheDocument()
  })

  it('starts login automatically and carries the protected page through the redirect', async () => {
    const loginSpy = vi.fn(() => Promise.resolve(success(undefined)))
    renderLoginPage(buildContainer(loginSpy), {
      returnTo: '/services?search=massagem#editor',
      theme: 'dark',
    })

    expect(
      await screen.findByRole('heading', { name: /redirecionando para o login/i }),
    ).toBeInTheDocument()
    expect(loginSpy).toHaveBeenCalledExactlyOnceWith('/services?search=massagem#editor', 'dark')
  })

  it('starts only one redirect under React.StrictMode', async () => {
    const loginSpy = vi.fn(() => Promise.resolve(success(undefined)))
    renderLoginPage(buildContainer(loginSpy), { strict: true })

    await screen.findByRole('heading', { name: /redirecionando para o login/i })

    expect(loginSpy).toHaveBeenCalledTimes(1)
  })

  it('returns an already authenticated user to the requested page without opening login again', async () => {
    const tenant = Tenant.create('tenant-123')
    const tenantContext: TenantContext = {
      tenant,
      user: User.create({ id: 'user-1', tenant }),
    }
    const loginSpy = vi.fn(() => Promise.resolve(success(undefined)))
    renderLoginPage(
      buildContainer(loginSpy, () => Promise.resolve(tenantContext)),
      {
        returnTo: '/services?search=massagem',
      },
    )

    expect(await screen.findByText('Services page')).toBeInTheDocument()
    expect(loginSpy).not.toHaveBeenCalled()
  })

  it('shows a specific failure, support code, and successful retry action', async () => {
    const loginSpy = vi
      .fn<() => Promise<Result<void, AuthFlowError>>>()
      .mockResolvedValueOnce(
        failure(
          new AuthFlowError({
            code: 'network',
            flowCode: 'AUTH_LOGIN_UNAVAILABLE',
            message:
              'Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente.',
            retryable: true,
          }),
        ),
      )
      .mockResolvedValueOnce(success(undefined))
    renderLoginPage(buildContainer(loginSpy))

    expect(
      await screen.findByRole('heading', { name: /serviço de login indisponível/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('AUTH_LOGIN_UNAVAILABLE')).toBeInTheDocument()
    expect(screen.getByText(/envie este código e o horário da tentativa/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /tentar entrar novamente/i }))

    expect(loginSpy).toHaveBeenCalledTimes(2)
  })

  it('has no axe violations in the automatic redirect state', async () => {
    const container = renderLoginPage(buildContainer())
    await screen.findByRole('heading', { name: /redirecionando para o login/i })

    expect(await axe(container)).toHaveNoViolations()
  })
})
