import { test, expect } from '@playwright/test';
import { loginAsDemoUser, LOGIN_URL_RE } from './helpers';

// Matches authClient.ts's UserManager config (env-contract.md) — oidc-client-ts's
// WebStorageStateStore key format.
const OIDC_STORAGE_KEY = 'oidc.user:http://localhost:5081:admin-panel';

interface StoredOidcUser {
  access_token: string;
}

interface AccessTokenPayload {
  tenant_id: string;
}

// The demo tenant's id is generated fresh (Guid.CreateVersion7()) every time the database is
// seeded, so it differs per environment — read it from the token actually issued to this
// session instead of asserting a hardcoded value.
async function getSignedInTenantId(page: import('@playwright/test').Page): Promise<string> {
  const stored = await page.evaluate((key) => localStorage.getItem(key), OIDC_STORAGE_KEY);
  const { access_token: accessToken } = JSON.parse(stored ?? '{}') as StoredOidcUser;
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) {
    throw new Error(`Access token has no payload segment: ${accessToken}`);
  }
  const payload = JSON.parse(
    Buffer.from(payloadSegment, 'base64url').toString('utf-8'),
  ) as AccessTokenPayload;
  return payload.tenant_id;
}

test('unauthenticated visitor is redirected to identity-service login (quickstart Scenario 1, spec FR-001/FR-002)', async ({
  page,
}) => {
  await page.goto('/');

  await page.waitForURL(LOGIN_URL_RE);
  await expect(page.locator('#Email')).toBeVisible();
});

test('a real login as the DemoTenant user renders the shell scoped to the matching tenant (quickstart Scenario 2, spec FR-003/FR-004)', async ({
  page,
}) => {
  await loginAsDemoUser(page);

  await expect(page.getByText('Agenza Admin')).toBeVisible();
  const tenantId = await getSignedInTenantId(page);

  // Tenant id lives in the account menu, not loose header chrome — open it first.
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await expect(page.getByTestId('tenant-id')).toHaveText(tenantId);
});

test('an active session persists across reload and logout fully ends it (quickstart Scenario 3, spec FR-007/FR-008)', async ({
  page,
}) => {
  await loginAsDemoUser(page);

  // Reload rather than waiting out the real token lifetime: this exercises the same
  // localStorage-backed session check (I1 remediation) that silent renewal depends on,
  // without the flakiness of a real-time wait for token expiry.
  await page.reload();
  await expect(page.getByText('Agenza Admin')).toBeVisible();

  // Sign-out lives in the account menu (a menuitem, not a standalone button) — open it first.
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: /sair/i }).click();

  // Logging out and landing back on /login (which always re-triggers signinRedirect) ends
  // up back at identity-service's real credentials form only if BOTH the local and
  // identity-service sessions were actually cleared — a silently-restored session would
  // bounce straight back into the app instead.
  await page.waitForURL(LOGIN_URL_RE);
  await expect(page.locator('#Email')).toBeVisible();
});
