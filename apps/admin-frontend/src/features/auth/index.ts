/** Import only from here — never internal files (enforced by `no-restricted-imports`). */
export { AuthProvider, AuthContext, type AuthContextValue } from './AuthProvider';
export { useAuth } from './hooks/useAuth';
export { ProtectedRoute } from './ProtectedRoute';
export { SignInRedirect } from './components/SignInRedirect';
export { LoginRedirect } from './components/LoginRedirect';
export {
  INITIAL_SESSION,
  type Session,
  type SessionStatus,
  type SessionFailureReason,
  type TenantContext,
  type AuthenticatedUser,
} from './types';
