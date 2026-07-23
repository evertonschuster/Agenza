import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSX } from 'react'
import { AuthProvider } from '@/features/auth/presentation/AuthProvider'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { useAuth } from '@/features/auth/presentation/useAuth'
import { createFakeSessionEventBus } from '@/test/fixtures/fakeSessionEventBus'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { SessionEventBus } from '@/shared/application/SessionEventBus'
import type { AppContainer, AuthFacade } from '@/app/composition/container'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'

function createFakeContainer(
  overrides: Partial<AuthFacade> = {},
  sessionEvents: SessionEventBus = createFakeSessionEventBus(),
): AppContainer {
  return createFakeAppContainer({ auth: { sessionEvents, ...overrides } })
}

function StatusConsumer(): JSX.Element {
  const { status, tenantContext } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="tenant">{tenantContext?.tenant.id ?? 'none'}</span>
    </div>
  )
}

function renderWithAuth(
  container: AppContainer,
  children: JSX.Element = <StatusConsumer />,
): ReturnType<typeof render> {
  return render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>{children}</AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('AuthProvider', () => {
  it('starts loading and resolves to unauthenticated when there is no session', async () => {
    renderWithAuth(createFakeContainer())

    expect(screen.getByTestId('status')).toHaveTextContent('loading')

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
  })

  it('resolves to authenticated with the tenant context when a session exists', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })

    renderWithAuth(
      createFakeContainer({
        getCurrentSession: { execute: vi.fn(() => Promise.resolve({ tenant, user })) },
      }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('tenant')).toHaveTextContent('tenant-123')
  })

  it('shares a single session snapshot across every consumer instead of one fetch per call site', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const getCurrentSessionSpy = vi.fn(() => Promise.resolve({ tenant, user }))
    const container = createFakeContainer({ getCurrentSession: { execute: getCurrentSessionSpy } })

    render(
      <AppContainerContext.Provider value={container}>
        <AuthProvider>
          <StatusConsumer />
          <StatusConsumer />
          <StatusConsumer />
        </AuthProvider>
      </AppContainerContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('status')[0]).toHaveTextContent('authenticated')
    })

    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(1)
  })

  it('calls initiateLogin when login is invoked', async () => {
    const initiateLoginSpy = vi.fn(() => Promise.resolve())

    function LoginConsumer(): JSX.Element {
      const { login } = useAuth()
      return <button onClick={() => void login()}>Entrar</button>
    }

    renderWithAuth(
      createFakeContainer({ initiateLogin: { execute: initiateLoginSpy } }),
      <LoginConsumer />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(initiateLoginSpy).toHaveBeenCalledTimes(1)
  })

  it('calls logout and clears the session when logout is invoked', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const logoutSpy = vi.fn(() => Promise.resolve())

    function LogoutConsumer(): JSX.Element {
      const { status, logout } = useAuth()
      return (
        <div>
          <span data-testid="status">{status}</span>
          <button onClick={() => void logout()}>Sair</button>
        </div>
      )
    }

    renderWithAuth(
      createFakeContainer({
        getCurrentSession: { execute: vi.fn(() => Promise.resolve({ tenant, user })) },
        logout: { execute: logoutSpy },
      }),
      <LogoutConsumer />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(logoutSpy).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
  })

  it('clears the session when the session event bus reports invalidation (e.g. a 401)', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const sessionEvents = createFakeSessionEventBus()

    renderWithAuth(
      createFakeContainer(
        { getCurrentSession: { execute: vi.fn(() => Promise.resolve({ tenant, user })) } },
        sessionEvents,
      ),
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    act(() => {
      sessionEvents.notifyUnauthenticated()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
    expect(screen.getByTestId('tenant')).toHaveTextContent('none')
  })

  it('does not throw when the session is invalidated multiple times in a row (no redirect loop)', async () => {
    const sessionEvents = createFakeSessionEventBus()
    renderWithAuth(createFakeContainer({}, sessionEvents))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })

    expect(() => {
      act(() => {
        sessionEvents.notifyUnauthenticated()
        sessionEvents.notifyUnauthenticated()
        sessionEvents.notifyUnauthenticated()
      })
    }).not.toThrow()

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
  })
})
