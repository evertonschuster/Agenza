/** Import only from here — never internal files (enforced by `no-restricted-imports`). */
export { AuthProvider } from './presentation/AuthProvider';
export { AuthContext, type AuthContextValue } from './presentation/AuthContext';
export { useAuth } from './presentation/hooks/useAuth';
export { ProtectedRoute } from './presentation/ProtectedRoute';
export { LoginPage } from './presentation/pages/LoginPage/LoginPage';
export { AuthCallbackPage } from './presentation/pages/AuthCallbackPage/AuthCallbackPage';
export { INITIAL_SESSION } from './domain/session';
export type { Session, SessionStatus, SessionFailureReason } from './domain/session';
export type { TenantContext } from './domain/tenant';
export type { AuthenticatedUser } from './domain/user';
