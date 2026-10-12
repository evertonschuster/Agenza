import { test, expect, type Page } from '@playwright/test';
import { loginAsDemoUser } from './helpers';

function validCpf(): string {
  const checkDigit = (digits: number[]) => {
    const weightStart = digits.length + 1;
    const sum = digits.reduce((total, digit, index) => total + digit * (weightStart - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const first = checkDigit(base);
  const second = checkDigit([...base, first]);
  return [...base, first, second].join('');
}

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function openNewPersonForm(page: Page) {
  await page.getByRole('link', { name: 'Pessoas' }).click();
  await expect(page).toHaveURL(/\/pessoas$/);
  await page.getByRole('link', { name: 'Nova pessoa' }).click();
  await expect(page).toHaveURL(/\/pessoas\/nova$/);
  await expect(page.getByRole('heading', { name: 'Nova pessoa' })).toBeVisible();
}

test.describe('Register a person', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('reaches the form from the Pessoas area and saves a person described only by the name', async ({
    page,
  }) => {
    await openNewPersonForm(page);

    await page.getByLabel('Nome completo').fill(uniqueName('Pessoa E2E'));
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page).toHaveURL(/\/pessoas$/);
    await expect(page.getByText('Pessoa cadastrada')).toBeVisible();
  });

  test('asks for a guardian only when the birth date indicates a minor, then saves with one', async ({
    page,
  }) => {
    await openNewPersonForm(page);
    const person = page.getByRole('region', { name: 'Dados da pessoa' });
    const tenYearsAgo = new Date().getFullYear() - 10;

    await person.getByLabel('Nome completo').fill(uniqueName('Menor E2E'));
    await expect(page.getByRole('status')).toHaveCount(0);
    await person.getByLabel('Data de nascimento').fill(`15/06/${tenYearsAgo}`);
    await expect(page.getByRole('status')).toContainText('Informe ao menos um responsável');

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Informe ao menos um responsável para pessoas menores de 18 anos.',
    );
    await expect(page).toHaveURL(/\/pessoas\/nova$/);

    await page.getByRole('button', { name: 'Adicionar responsável' }).click();
    const guardian = page.getByRole('group', { name: 'Responsável 1' });
    await guardian.getByLabel('Nome').fill('Responsável E2E');
    await guardian.getByLabel('Vínculo').fill('Mãe');
    await page.getByRole('button', { name: 'Adicionar pessoa de referência' }).click();
    const reference = page.getByRole('group', { name: 'Pessoa de referência 1' });
    await reference.getByLabel('Nome').fill('Contato E2E');
    await reference.getByLabel('Vínculo').fill('Tio');
    await reference.getByRole('checkbox', { name: 'Emergência' }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page).toHaveURL(/\/pessoas$/);
    await expect(page.getByText('Pessoa cadastrada')).toBeVisible();
  });

  test('refuses a CPF that already belongs to someone and keeps what was typed', async ({
    page,
  }) => {
    const cpf = validCpf();
    await openNewPersonForm(page);
    await page.getByLabel('Nome completo').fill(uniqueName('Primeira E2E'));
    await page.getByRole('region', { name: 'Dados da pessoa' }).getByLabel('CPF').fill(cpf);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/\/pessoas$/);

    await page.getByRole('link', { name: 'Nova pessoa' }).click();
    const person = page.getByRole('region', { name: 'Dados da pessoa' });
    const secondName = uniqueName('Segunda E2E');
    await person.getByLabel('Nome completo').fill(secondName);
    await person.getByLabel('CPF').fill(cpf);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(person.getByText('Já existe uma pessoa cadastrada com este CPF.')).toBeVisible();
    await expect(person.getByLabel('Nome completo')).toHaveValue(secondName);
    await expect(page).toHaveURL(/\/pessoas\/nova$/);
  });
});
