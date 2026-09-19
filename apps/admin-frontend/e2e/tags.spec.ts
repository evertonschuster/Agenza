import { test, expect } from '@playwright/test';
import { loginAsDemoUser, seedTagInUseByAService } from './helpers';

function uniqueName(base: string): string {
  return `${base} ${Date.now()}`;
}

test.describe('Tags CRUD', () => {
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

  test('creates a tag, blocks a duplicate name, then finds it by search (quickstart Scenarios 1-2, spec US1/US2/FR-004)', async ({
    page,
  }) => {
    const name = uniqueName('Promoção');
    await page.goto('/tags');

    await page.getByRole('link', { name: 'Nova etiqueta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByRole('radio', { name: 'Âmbar', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByRole('heading', { name: 'Nova etiqueta' })).not.toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Nova etiqueta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByRole('radio', { name: 'Verde', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(`Já existe uma etiqueta chamada '${name}'.`)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByLabel('Buscar etiquetas por nome').fill(name);
    await page.getByRole('search').getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('edits an existing tag and the list reflects the change (spec US3)', async ({ page }) => {
    const originalName = uniqueName('Sazonal');
    const renamedTo = uniqueName('Sazonal Editado');
    await page.goto('/tags');

    await page.getByRole('link', { name: 'Nova etiqueta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(originalName);
    await page.getByRole('radio', { name: 'Azul', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(originalName, { exact: true })).toBeVisible();

    // Resting-state visibility, no hover/focus first — this app is mobile-first (no :hover),
    // so a row action that only reveals on hover is effectively undiscoverable there.
    await expect(page.getByRole('link', { name: `Editar ${originalName}` })).toBeVisible();
    await expect(page.getByRole('link', { name: `Excluir ${originalName}` })).toBeVisible();

    await page.getByRole('link', { name: `Editar ${originalName}` }).click();
    await page.getByLabel('Nome', { exact: true }).fill(renamedTo);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(renamedTo, { exact: true })).toBeVisible();
    await expect(page.getByText(originalName, { exact: true })).not.toBeVisible();
  });

  test('deletes an unused tag (spec US4)', async ({ page }) => {
    const name = uniqueName('Descartável');
    await page.goto('/tags');

    await page.getByRole('link', { name: 'Nova etiqueta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByRole('radio', { name: 'Cinza', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    await page.getByRole('link', { name: `Excluir ${name}` }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();

    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });

  test('blocks deleting a tag in use by a service, with the exact count from the backend (spec FR-008, SC-003)', async ({
    page,
  }) => {
    const name = uniqueName('Em uso');
    await page.goto('/tags');
    await seedTagInUseByAService(page, name);

    await page.reload();
    const searchInput = page.getByLabel('Buscar etiquetas por nome');
    await searchInput.fill(name);
    await searchInput.press('Enter');
    await expect(page.getByRole('link', { name: `Excluir ${name}` })).toBeVisible();
    await page.getByRole('link', { name: `Excluir ${name}` }).click();
    await page.getByRole('button', { name: 'Excluir' }).click();

    await expect(
      page.getByText('Esta etiqueta está em uso por 1 serviço(s) e não pode ser excluída.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Entendi' }).click();

    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });
});
