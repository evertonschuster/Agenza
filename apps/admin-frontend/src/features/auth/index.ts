// Public API of the auth feature (ADR 009) - the only path other features
// and app/ may import auth internals through.

export { useAuth } from './presentation/useAuth'
export { AuthProvider } from './presentation/AuthProvider'
export { TenantBoundary } from './presentation/TenantBoundary'
export { ProtectedRoute } from './presentation/ProtectedRoute'
export { LoginPage } from './presentation/LoginPage/LoginPage'
export { CallbackPage } from './presentation/CallbackPage/CallbackPage'

export { toTenantContext } from './application/context/TenantContext'
export type { TenantContext } from './application/context/TenantContext'
export type { AuthRepository } from './application/repositories/AuthRepository'
export { InitiateLogin } from './application/use-cases/InitiateLogin'
export { HandleAuthCallback } from './application/use-cases/HandleAuthCallback'
export { GetCurrentSession } from './application/use-cases/GetCurrentSession'
export { Logout } from './application/use-cases/Logout'

export { Tenant } from './domain/value-objects/Tenant'
export { User } from './domain/entities/User'

// Composition-root-only wiring (docs/adr/008) - not for use outside app/composition.
export { OidcAuthRepository } from './infrastructure/OidcAuthRepository'
export { createUserManager } from './infrastructure/createUserManager'
