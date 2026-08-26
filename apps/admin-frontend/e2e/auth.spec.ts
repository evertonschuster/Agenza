import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'owner@demo.local';
const DEMO_PASSWORD = 'Passw0rd!';
const LOGIN_URL_RE = /localhost:5081\/Account\/Login/;
// Matches authClient.ts's UserManager config (env-contract.md) — oidc-client-ts's
// WebStorageStateStore key format.
const OIDC_STORAGE_KEY = 'oidc.user:http://localhost:5081:admin-panel';

async function loginAsDemoUser(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(DEMO_EMAIL);
  await page.locator('#Password').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}

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

  await page.getByRole('button', { name: /sair/i }).click();

  // Logging out and landing back on /login (which always re-triggers signinRedirect) ends
  // up back at identity-service's real credentials form only if BOTH the local and
  // identity-service sessions were actually cleared — a silently-restored session would
  // bounce straight back into the app instead.
  await page.waitForURL(LOGIN_URL_RE);
  await expect(page.locator('#Email')).toBeVisible();
});
