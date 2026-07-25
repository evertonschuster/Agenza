import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { User } from '@/features/auth/domain/entities/User'

// A tenant-scoped use case takes this as a parameter, so "did we scope this
// query by tenant" is a type-level question, not a per-call-site reminder.
export interface TenantContext {
  readonly tenant: Tenant
  readonly user: User
}

export function toTenantContext(user: User): TenantContext {
  return { tenant: user.tenant, user }
}
