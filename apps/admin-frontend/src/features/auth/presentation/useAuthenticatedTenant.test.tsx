import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode, JSX } from 'react'
import { useAuthenticatedTenant } from '@/features/auth/presentation/useAuthenticatedTenant'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { User } from '@/features/auth/domain/entities/User'

const noopActions = { login: () => Promise.resolve(), logout: () => Promise.resolve() }

function buildWrapper(value: AuthContextValue): (props: { children: ReactNode }) => JSX.Element {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }
}

describe('useAuthenticatedTenant', () => {
  it('throws when the session is still loading', () => {
    const wrapper = buildWrapper({ status: 'loading', tenantContext: null, ...noopActions })

    expect(() => renderHook(() => useAuthenticatedTenant(), { wrapper })).toThrow(
      /useAuthenticatedTenant must be used within an authenticated route/,
    )
  })

  it('throws when unauthenticated', () => {
    const wrapper = buildWrapper({ status: 'unauthenticated', tenantContext: null, ...noopActions })

    expect(() => renderHook(() => useAuthenticatedTenant(), { wrapper })).toThrow(
      /useAuthenticatedTenant must be used within an authenticated route/,
    )
  })

  it('returns the tenant context, never null, when authenticated', () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const wrapper = buildWrapper({
      status: 'authenticated',
      tenantContext: { tenant, user },
      ...noopActions,
    })

    const { result } = renderHook(() => useAuthenticatedTenant(), { wrapper })

    expect(result.current.tenant.id).toBe('tenant-123')
    expect(result.current.user.id).toBe('user-1')
  })
})
