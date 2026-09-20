import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './helpers';

test.describe('Tags listing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('reaches the screen through the command palette, at /tags (spec FR-014)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('option', { name: 'Etiquetas' }).click();

    await expect(page).toHaveURL(/\/tags$/);
    await expect(page.getByRole('heading', { name: 'Etiquetas' })).toBeVisible();
  });
});
