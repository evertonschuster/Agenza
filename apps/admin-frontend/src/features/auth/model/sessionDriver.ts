import type { User } from 'oidc-client-ts';
import { sessionStore } from '@/shared/session/sessionStore';
import type { SessionPrincipal } from '@/shared/session/session';
import { themeStore } from '@/shared/theme/themeStore';
import { logger } from '@/shared/logger';
import { authClient } from '../api/authClient';

function toPrincipal(user: User): SessionPrincipal {
  return {
    subject: user.profile.sub,
    accessToken: user.access_token,
    expiresAt: user.expires_at ? user.expires_at * 1000 : null,
    displayName: typeof user.profile.name === 'string' ? user.profile.name : null,
    email: typeof user.profile.email === 'string' ? user.profile.email : null,
  };
}

// A late renewal must not replace the session state that is redirecting to login or logout.
function isLeavingSession(): boolean {
  const { status } = sessionStore.getSnapshot().session;
  return status === 'loggingOut' || status === 'authenticating';
}

let pendingUserRemoval: Promise<void> = Promise.resolve();

function discardChangedIdentity(): void {
  if (sessionStore.getSnapshot().session.failureReason !== 'identity_changed') return;
  authClient.stopSilentRenew();
  pendingUserRemoval = authClient.removeUser().catch(() => {
    logger.warn('auth.session_cleanup_failed');
  });
}

export function startListening(): () => void {
  let stopped = false;
  const initialSnapshot = sessionStore.getSnapshot();

  const handleUserLoaded = (user: User): void => {
    if (stopped || isLeavingSession()) return;
    if (sessionStore.getSnapshot().session.failureReason === 'identity_changed') return;

    sessionStore.dispatch({ type: 'USER_LOADED', principal: toPrincipal(user) });
    discardChangedIdentity();
  };

  const handleSilentRenewError = (): void => {
    if (stopped || isLeavingSession()) return;
    sessionStore.dispatch({ type: 'SILENT_RENEW_ERROR' });
  };

  const handleUserUnloaded = (): void => {
    if (stopped || isLeavingSession()) return;
    sessionStore.dispatch({ type: 'USER_UNLOADED' });
  };

  authClient.events.addUserLoaded(handleUserLoaded);
  authClient.events.addSilentRenewError(handleSilentRenewError);
  authClient.events.addUserUnloaded(handleUserUnloaded);

  authClient
    .getUser()
    .then((user) => {
      if (stopped || sessionStore.getSnapshot() !== initialSnapshot || isLeavingSession()) return;
      const principal = user && !user.expired ? toPrincipal(user) : null;
      sessionStore.dispatch({ type: 'INITIAL_USER', principal });
      discardChangedIdentity();
    })
    .catch(() => {
      if (stopped || sessionStore.getSnapshot() !== initialSnapshot || isLeavingSession()) return;
      sessionStore.dispatch({ type: 'INITIAL_ERROR' });
    });

  return () => {
    stopped = true;
    authClient.events.removeUserLoaded(handleUserLoaded);
    authClient.events.removeSilentRenewError(handleSilentRenewError);
    authClient.events.removeUserUnloaded(handleUserUnloaded);
  };
}

export async function login(): Promise<void> {
  const identityChanged = sessionStore.getSnapshot().session.failureReason === 'identity_changed';
  sessionStore.dispatch({ type: 'LOGIN_STARTED' });
  try {
    await pendingUserRemoval;
    // Read at call time, not baked into authClient's UserManager construction, so the
    // extension parameter always reflects the theme choice active right now (ADR 0020, 0040).
    await authClient.signinRedirect({
      ...(identityChanged ? { prompt: 'login' } : {}),
      extraQueryParams: { theme: themeStore.getSnapshot().resolved },
    });
  } catch {
    sessionStore.dispatch({ type: 'LOGIN_ERROR' });
  }
}

export async function logout(): Promise<void> {
  sessionStore.dispatch({ type: 'LOGOUT_STARTED' });
  try {
    await authClient.signoutRedirect();
  } catch {
    sessionStore.dispatch({ type: 'USER_UNLOADED' });
  }
}
