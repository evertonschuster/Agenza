/**
 * Public API of the `auth` feature. Other features/app code MUST import only from here —
 * never reach into this feature's internal files directly (enforced by the `no-restricted-imports`
 * rule in eslint.config.js). This is what keeps the feature's internals refactorable without
 * breaking every consumer.
 */
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
