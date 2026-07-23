import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState, type JSX } from 'react'
import { TenantBoundary } from '@/features/auth/presentation/TenantBoundary'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { User } from '@/features/auth/domain/entities/User'

function buildAuthValue(tenantContext: AuthContextValue['tenantContext']): AuthContextValue {
  return {
    status: tenantContext !== null ? 'authenticated' : 'unauthenticated',
    tenantContext,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
  }
}

function StatefulChild(): JSX.Element {
  const [count, setCount] = useState(0)
  return (
    <button
      onClick={() => {
        setCount(current => current + 1)
      }}
    >
      count: {count}
    </button>
  )
}

describe('TenantBoundary', () => {
  it('remounts children, resetting their local state, when the tenant changes', () => {
    const tenantA = Tenant.create('tenant-a')
    const userA = User.create({ id: 'user-1', tenant: tenantA })
    const tenantB = Tenant.create('tenant-b')
    const userB = User.create({ id: 'user-1', tenant: tenantB })

    const { rerender } = render(
      <AuthContext.Provider value={buildAuthValue({ tenant: tenantA, user: userA })}>
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('count: 1')

    rerender(
      <AuthContext.Provider value={buildAuthValue({ tenant: tenantB, user: userB })}>
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('count: 0')
  })

  it('remounts when the user changes even within the same tenant', () => {
    const tenant = Tenant.create('tenant-a')
    const userA = User.create({ id: 'user-1', tenant })
    const userB = User.create({ id: 'user-2', tenant })

    const { rerender } = render(
      <AuthContext.Provider value={buildAuthValue({ tenant, user: userA })}>
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('count: 1')

    rerender(
      <AuthContext.Provider value={buildAuthValue({ tenant, user: userB })}>
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('count: 0')
  })

  it('does not remount when the same user+tenant is refetched as a new object reference', () => {
    const tenant = Tenant.create('tenant-a')
    const user = User.create({ id: 'user-1', tenant })

    const { rerender } = render(
      <AuthContext.Provider value={buildAuthValue({ tenant, user })}>
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('count: 1')

    // Same ids via freshly constructed Tenant/User instances (e.g. a
    // session refresh) - identity by value, not by reference, must not
    // remount and discard in-progress UI state.
    const sameTenantAgain = Tenant.create('tenant-a')
    const sameUserAgain = User.create({ id: 'user-1', tenant: sameTenantAgain })

    rerender(
      <AuthContext.Provider
        value={buildAuthValue({ tenant: sameTenantAgain, user: sameUserAgain })}
      >
        <TenantBoundary>
          <StatefulChild />
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('count: 1')
  })

  it('renders children when there is no session', () => {
    render(
      <AuthContext.Provider value={buildAuthValue(null)}>
        <TenantBoundary>
          <div>content</div>
        </TenantBoundary>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
