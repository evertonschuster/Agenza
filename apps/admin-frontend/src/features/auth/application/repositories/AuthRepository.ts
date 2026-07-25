import { Session } from '@/features/auth/domain/entities/Session'

export interface AuthRepository {
  initiateLogin(): Promise<void>

  // callbackUrl is the full redirect-back URL (query/fragment included),
  // kept as a plain string so this port has no routing-library dependency.
  handleCallback(callbackUrl: string): Promise<Session>

  // Attempts a silent renewal first if the token is expired/near-expiry;
  // null if there's no session or renewal failed (stale state is cleared).
  getCurrentSession(): Promise<Session | null>

  logout(): Promise<void>
}
