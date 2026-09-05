import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsDemoUser } from './helpers';

const THEMES = ['light', 'dark'] as const;

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemoUser(page);
      await page.evaluate((value) => localStorage.setItem('admin-theme', value), theme);
      await page.reload();
    });

    test('shell and Início have no automated a11y violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    });

    test('Serviços has no automated a11y violations', async ({ page }) => {
      await page.getByRole('link', { name: 'Serviços' }).click();
      await page.waitForURL('**/servicos');

      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    });
  });
}
