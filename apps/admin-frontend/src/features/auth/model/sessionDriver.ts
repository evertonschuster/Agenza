import type { User } from 'oidc-client-ts';
import { sessionStore } from '@/shared/session/sessionStore';
import type { SessionPrincipal } from '@/shared/session/session';
import { themeStore } from '@/shared/theme/themeStore';
import { authClient } from '../api/authClient';

function toPrincipal(user: User): SessionPrincipal {
  return {
    accessToken: user.access_token,
    expiresAt: user.expires_at ? user.expires_at * 1000 : null,
    displayName: typeof user.profile.name === 'string' ? user.profile.name : null,
    email: typeof user.profile.email === 'string' ? user.profile.email : null,
  };
}

// A silent renewal or the initial getUser() can resolve after logout() has already dispatched
// LOGOUT_STARTED; without this guard the late one overwrites 'loggingOut' and fights
// signoutRedirect()'s own navigation.
function isLoggingOut(): boolean {
  return sessionStore.getSnapshot().session.status === 'loggingOut';
}

const handleUserLoaded = (user: User): void => {
  if (isLoggingOut()) return;
  sessionStore.dispatch({ type: 'USER_LOADED', principal: toPrincipal(user) });
};

const handleSilentRenewError = (): void => {
  if (isLoggingOut()) return;
  sessionStore.dispatch({ type: 'SILENT_RENEW_ERROR' });
};

const handleUserUnloaded = (): void => {
  if (isLoggingOut()) return;
  sessionStore.dispatch({ type: 'USER_UNLOADED' });
};

export function startListening(): () => void {
  authClient.events.addUserLoaded(handleUserLoaded);
  authClient.events.addSilentRenewError(handleSilentRenewError);
  authClient.events.addUserUnloaded(handleUserUnloaded);

  authClient
    .getUser()
    .then((user) => {
      if (isLoggingOut()) return;
      const principal = user && !user.expired ? toPrincipal(user) : null;
      sessionStore.dispatch({ type: 'INITIAL_USER', principal });
    })
    .catch(() => {
      if (isLoggingOut()) return;
      sessionStore.dispatch({ type: 'INITIAL_ERROR' });
    });

  return () => {
    authClient.events.removeUserLoaded(handleUserLoaded);
    authClient.events.removeSilentRenewError(handleSilentRenewError);
    authClient.events.removeUserUnloaded(handleUserUnloaded);
  };
}

export async function login(): Promise<void> {
  sessionStore.dispatch({ type: 'LOGIN_STARTED' });
  try {
    // Read at call time, not baked into authClient's UserManager construction, so the
    // extension parameter always reflects the theme choice active right now (ADR 0020, 0040).
    await authClient.signinRedirect({
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
