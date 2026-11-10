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
export const LOGIN_URL_RE = /localhost:5081\/Account\/Login/;

export async function loginAsDemoUser(page: Page): Promise<void> {
  await loginAsUser(page, DEMO_EMAIL, DEMO_PASSWORD);
}

export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(email);
  await page.locator('#Password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}
