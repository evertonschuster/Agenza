import { Tenant as TenantEntity } from '@/features/auth/domain/value-objects/Tenant'
import { User as UserEntity } from '@/features/auth/domain/entities/User'
import { Session as SessionEntity } from '@/features/auth/domain/entities/Session'
import { unwrapResult } from '@/test/fixtures/unwrapResult'

// Test-only: same call shape as the real entities' create(), unwrapped -
// fixtures always build from known-valid data, so a Result.Failure here
// means the fixture itself is wrong (unwrapResult fails loud on that).
// Lets call sites read exactly like the real entities without every test
// file wrapping every call in unwrapResult(...).
export const Tenant = {
  create: (id: Parameters<typeof TenantEntity.create>[0]): TenantEntity =>
    unwrapResult(TenantEntity.create(id)),
}

export const User = {
  create: (input: Parameters<typeof UserEntity.create>[0]): UserEntity =>
    unwrapResult(UserEntity.create(input)),
}

export const Session = {
  create: (input: Parameters<typeof SessionEntity.create>[0]): SessionEntity =>
    unwrapResult(SessionEntity.create(input)),
}
