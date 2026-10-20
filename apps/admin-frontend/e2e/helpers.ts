import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

interface IdentityDevelopmentSettings {
  DemoTenant: { OwnerEmail: string; OwnerPassword: string };
}

const IDENTITY_DEVELOPMENT_SETTINGS = new URL(
  '../../../backend/services/identity-service/IdentityService.Api/appsettings.Development.json',
  import.meta.url,
);
const { OwnerEmail: DEMO_EMAIL, OwnerPassword: DEMO_PASSWORD } = (
  JSON.parse(readFileSync(IDENTITY_DEVELOPMENT_SETTINGS, 'utf8')) as IdentityDevelopmentSettings
).DemoTenant;
const OIDC_STORAGE_KEY = 'oidc.user:http://localhost:5081:admin-panel';
const CLIENTS_URL = 'http://localhost:5080/api/v1.0/clients';
export const LOGIN_URL_RE = /localhost:5081\/Account\/Login/;

export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(DEMO_EMAIL);
  await page.locator('#Password').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}

export async function registerPeopleThroughApi(page: Page, fullNames: string[]): Promise<void> {
  await page.evaluate(
    async ({ storageKey, url, names }) => {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as {
        access_token: string;
      };
      const payloadSegment = stored.access_token.split('.')[1] ?? '';
      const payload = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))) as {
        tenant_id: string;
      };

      for (const fullName of names) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stored.access_token}`,
            'X-Tenant-Id': payload.tenant_id,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName,
            birthDate: null,
            phone: null,
            email: null,
            cpf: null,
            administrativeNotes: null,
            guardians: [],
            referenceContacts: [],
          }),
        });
        if (!response.ok)
          throw new Error(`POST /clients answered ${response.status} for ${fullName}`);
      }
    },
    { storageKey: OIDC_STORAGE_KEY, url: CLIENTS_URL, names: fullNames },
  );
}
