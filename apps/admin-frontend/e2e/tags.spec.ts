import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './helpers';

test.describe('Tags listing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('reaches the screen through the command palette, at /tags', async ({ page }) => {
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('option', { name: 'Etiquetas' }).click();

    await expect(page).toHaveURL(/\/tags$/);
    await expect(page.getByRole('heading', { name: 'Etiquetas' })).toBeVisible();
  });

  test('opens a linked person in a new tab and retries deletion after removing the tag', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const tag = `Etiqueta E2E ${suffix}`;
    const person = `Pessoa E2E ${suffix}`;
    await page.goto('/tags/new');
    await page.getByLabel('Nome', { exact: true }).fill(tag);
    await page.getByRole('radio', { name: 'Azul', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/\/tags$/);

    await page.goto('/pessoas/nova');
    await page.getByLabel('Nome completo').fill(person);
    await page.getByRole('combobox', { name: 'Etiquetas' }).fill(tag);
    await page.getByRole('option', { name: tag, exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/\/pessoas$/);

    await page.goto(`/tags?search=${encodeURIComponent(tag)}`);
    await page.getByRole('link', { name: `Excluir ${tag}`, exact: true }).click();
    const dialog = page.locator('[data-slot="dialog-content"]');
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click();
    const personLink = dialog.getByRole('link', { name: new RegExp(person) });
    await expect(personLink).toBeVisible();
    const [editPage] = await Promise.all([context.waitForEvent('page'), personLink.click()]);
    await expect(editPage).toHaveURL(/\/pessoas\/[0-9a-f-]{36}\/editar/);
    await editPage.getByRole('button', { name: `Remover ${tag}`, exact: true }).click();
    await editPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(editPage).toHaveURL(/\/pessoas$/);

    await expect(dialog.getByRole('link', { name: new RegExp(person) })).toBeVisible();
    await dialog.getByRole('button', { name: 'Tentar excluir novamente' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Etiqueta excluída')).toBeVisible();
    await editPage.close();
  });
});
