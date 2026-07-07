import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act, type RenderHookResult } from '@testing-library/react'
import { useAuth, type UseAuthResult } from './useAuth'
import { AppContainerContext } from '../providers/AppContainerContext'
import type { AppContainer } from '../../composition/container'
import { User } from '../../domain/entities/User'
import { Tenant } from '../../domain/value-objects/Tenant'

interface FakeUseCases {
  initiateLogin: { execute: () => Promise<void> }
  handleAuthCallback: { execute: (callbackUrl: string) => Promise<unknown> }
  getCurrentSession: { execute: () => Promise<unknown> }
  logout: { execute: () => Promise<void> }
}

function createFakeContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    authRepository: {
      initiateLogin: () => Promise.resolve(),
      handleCallback: () => Promise.reject(new Error('not used in this fake')),
      getCurrentSession: () => Promise.resolve(null),
      logout: () => Promise.resolve(),
    },
    useCases: {
      initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
      handleAuthCallback: { execute: vi.fn(() => Promise.reject(new Error('not used'))) },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(null)) },
      logout: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  } as unknown as AppContainer
}

function renderUseAuth(container: AppContainer): RenderHookResult<UseAuthResult, undefined> {
  return renderHook<UseAuthResult, undefined>(() => useAuth(), {
    wrapper: ({ children }) => (
      <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
    ),
  })
}

describe('useAuth', () => {
  it('starts loading and resolves to unauthenticated when there is no session', async () => {
    const container = createFakeContainer()
    const { result } = renderUseAuth(container)

    expect(result.current.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.status).toBe('unauthenticated')
    })

    expect(result.current.tenantContext).toBeNull()
  })

  it('resolves to authenticated with the tenant context when a session exists', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })

    const container = createFakeContainer({
      getCurrentSession: {
        execute: vi.fn(() => Promise.resolve({ tenant, user })),
      },
    })

    const { result } = renderUseAuth(container)

    await waitFor(() => {
      expect(result.current.status).toBe('authenticated')
    })

    expect(result.current.tenantContext?.tenant.equals(tenant)).toBe(true)
  })

  it('calls initiateLogin use case when login is invoked', async () => {
    const initiateLoginSpy = vi.fn(() => Promise.resolve())
    const container = createFakeContainer({ initiateLogin: { execute: initiateLoginSpy } })
    const { result } = renderUseAuth(container)

    await waitFor(() => {
      expect(result.current.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.login()
    })

    expect(initiateLoginSpy).toHaveBeenCalledTimes(1)
  })

  it('calls logout use case and transitions to unauthenticated when logout is invoked', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const logoutSpy = vi.fn(() => Promise.resolve())

    const container = createFakeContainer({
      getCurrentSession: { execute: vi.fn(() => Promise.resolve({ tenant, user })) },
      logout: { execute: logoutSpy },
    })

    const { result } = renderUseAuth(container)

    await waitFor(() => {
      expect(result.current.status).toBe('authenticated')
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(logoutSpy).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.tenantContext).toBeNull()
  })
})
