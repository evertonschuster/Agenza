import { describe, it, expectTypeOf } from 'vitest'
import type { AuthSessionState } from '@/features/auth/presentation/AuthContext'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { User } from '@/features/auth/domain/entities/User'

describe('AuthSessionState', () => {
  it('never carries a tenant context while loading', () => {
    expectTypeOf<
      Extract<AuthSessionState, { status: 'loading' }>['tenantContext']
    >().toEqualTypeOf<null>()
  })

  it('never carries a tenant context while unauthenticated', () => {
    expectTypeOf<
      Extract<AuthSessionState, { status: 'unauthenticated' }>['tenantContext']
    >().toEqualTypeOf<null>()
  })

  it('always carries a tenant context while authenticated', () => {
    expectTypeOf<
      Extract<AuthSessionState, { status: 'authenticated' }>['tenantContext']
    >().toEqualTypeOf<TenantContext>()
  })

  it('rejects a loading state carrying a tenant context at the type level', () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })

    // @ts-expect-error loading must never carry a tenant context
    const invalid: AuthSessionState = { status: 'loading', tenantContext: { tenant, user } }
    void invalid
  })
})
