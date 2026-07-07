import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'

/**
 * Carries the authenticated tenant scope that every tenant-aware use case
 * (appointments, services, clients, conversations, etc.) will require as
 * an explicit parameter. This is the structural mechanism mentioned in the
 * architecture brief: a use case that needs tenant-scoped data takes a
 * TenantContext as a parameter, so "did we scope this query by tenant" is
 * a type-level question, not something every call site has to remember.
 *
 * Built from a Session once authentication succeeds (see GetCurrentSession).
 */
export interface TenantContext {
  readonly tenant: Tenant
  readonly user: User
}

export function toTenantContext(user: User): TenantContext {
  return { tenant: user.tenant, user }
}
