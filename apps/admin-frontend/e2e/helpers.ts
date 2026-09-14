import type { Page } from '@playwright/test';

const DEMO_EMAIL = 'owner@demo.local';
const DEMO_PASSWORD = 'Passw0rd!';
export const LOGIN_URL_RE = /localhost:5081\/Account\/Login/;

const SERVICES_API_BASE_URL = 'http://localhost:5080';
// Matches authClient.ts's UserManager config (env-contract.md) — oidc-client-ts's
// WebStorageStateStore key format. Same constant auth.spec.ts uses.
const OIDC_STORAGE_KEY = 'oidc.user:http://localhost:5081:admin-panel';

export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(DEMO_EMAIL);
  await page.locator('#Password').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}

async function readSessionCredentials(
  page: Page,
): Promise<{ accessToken: string; tenantId: string }> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), OIDC_STORAGE_KEY);
  if (!raw) {
    throw new Error('No OIDC session in localStorage — call loginAsDemoUser(page) first.');
  }

  const { access_token: accessToken } = JSON.parse(raw) as { access_token: string };
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) {
    throw new Error(`Access token has no payload segment: ${accessToken}`);
  }
  const { tenant_id: tenantId } = JSON.parse(
    Buffer.from(payloadSegment, 'base64url').toString('utf-8'),
  ) as { tenant_id: string };

  return { accessToken, tenantId };
}

// There is no Services-creation screen yet (Out of Scope of specs/003-tags-crud), so proving the
// "tag in use" delete guard needs a service seeded directly against services-service.
export async function seedTagInUseByAService(
  page: Page,
  tagName: string,
): Promise<{ tagId: string }> {
  const { accessToken, tenantId } = await readSessionCredentials(page);
  const headers = { Authorization: `Bearer ${accessToken}`, 'X-Tenant-Id': tenantId };

  const tagResponse = await page.request.post(`${SERVICES_API_BASE_URL}/api/v1/tags`, {
    headers,
    data: { name: tagName, color: '#0d9488', description: null },
  });
  if (!tagResponse.ok()) {
    throw new Error(`Seeding the tag failed: ${tagResponse.status()} ${await tagResponse.text()}`);
  }
  const tag = ((await tagResponse.json()) as { data: { id: string } }).data;

  const serviceResponse = await page.request.post(`${SERVICES_API_BASE_URL}/api/v1/services`, {
    headers,
    data: {
      name: `Serviço de teste (${tagName})`,
      description: null,
      durationMinutes: 30,
      minDurationMinutes: 30,
      maxDurationMinutes: 30,
      price: 100,
      maxDiscountPercentage: 0,
      categoryId: null,
      tagIds: [tag.id],
    },
  });
  if (!serviceResponse.ok()) {
    throw new Error(
      `Seeding the service failed: ${serviceResponse.status()} ${await serviceResponse.text()}`,
    );
  }

  return { tagId: tag.id };
}
