import { Session } from '../../domain/entities/Session'

/**
 * Port for authentication infrastructure. Deliberately has no knowledge of
 * OAuth, OIDC, IdentityServer, or oidc-client-ts - those are infrastructure
 * concerns. This interface only exposes what use cases need: trigger
 * login, complete login, read the current session, and log out.
 *
 * The redirect-based OAuth flow doesn't fit a single "login(username,
 * password)" method, so this is split into the distinct moments the flow
 * actually has: initiating a redirect, handling the return from that
 * redirect, and checking/maintaining an ongoing session afterward.
 */
export interface AuthRepository {
  /**
   * Begins the login flow by redirecting the browser to the identity
   * provider. Does not return a value - the browser navigates away.
   */
  initiateLogin(): Promise<void>

  /**
   * Completes the login flow after the identity provider redirects back
   * to our callback route. Exchanges whatever the provider sent (e.g. an
   * authorization code) for tokens and returns the resulting Session.
   *
   * callbackUrl is the full URL the browser was redirected to, including
   * query/fragment parameters - kept as a plain string here so this
   * interface has no dependency on a specific routing library's types.
   */
  handleCallback(callbackUrl: string): Promise<Session>

  /**
   * Returns the current session if one exists and is valid, attempting a
   * silent renewal first if the access token is expired or close to
   * expiring. Returns null if there is no session, or if one existed but
   * silent renewal failed (in which case the repository is also
   * responsible for clearing any stale local session state).
   */
  getCurrentSession(): Promise<Session | null>

  /**
   * Clears the local session and redirects to the identity provider's
   * end-session endpoint, so the provider's own session is also closed
   * (not just our local token).
   */
  logout(): Promise<void>
}
