import type { Page } from '@playwright/test';

const DEMO_EMAIL = 'owner@demo.local';
const DEMO_PASSWORD = 'Passw0rd!';
export const LOGIN_URL_RE = /localhost:5081\/Account\/Login/;

export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(DEMO_EMAIL);
  await page.locator('#Password').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}
