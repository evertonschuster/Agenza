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

function formatCpf(digits: string): string {
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

async function registerPerson(
  page: Page,
  person: { name: string; email: string; cpf: string },
): Promise<void> {
  await openNewPersonForm(page);
  const section = page.getByRole('region', { name: 'Dados da pessoa' });
  await section.getByLabel('Nome completo').fill(person.name);
  await section.getByLabel('E-mail').fill(person.email);
  await section.getByLabel('CPF').fill(person.cpf);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/\/pessoas$/);
}

async function searchFor(page: Page, term: string): Promise<void> {
  const search = page.getByLabel('Buscar pessoas por nome, e-mail ou CPF');
  await search.fill(term);
  await search.press('Enter');
}

test.describe('People list', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('finds a registered person by name, e-mail and masked CPF, showing the whole CPF and the situation', async ({
    page,
  }) => {
    const person = {
      name: uniqueName('Lista E2E'),
      email: `lista.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);

    for (const term of [person.name, person.email, formatCpf(person.cpf)]) {
      await searchFor(page, term);
      const row = page.getByRole('row', { name: new RegExp(person.name) });
      await expect(row).toBeVisible();
      await expect(row).toContainText(person.email);
      await expect(row).toContainText(formatCpf(person.cpf));
      await expect(row).toContainText('Ativa');
    }
  });

  test('names a search that finds nobody and clears it', async ({ page }) => {
    await page.getByRole('link', { name: 'Pessoas' }).click();
    await expect(page).toHaveURL(/\/pessoas$/);
    const term = `inexistente-${Date.now()}`;

    await searchFor(page, term);

    await expect(page.getByText(`Nenhuma pessoa encontrada para «${term}»`)).toBeVisible();
    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(page.getByLabel('Buscar pessoas por nome, e-mail ou CPF')).toHaveValue('');
    await expect(page.getByText(/Nenhuma pessoa encontrada para/)).toHaveCount(0);
  });

  test('opens the edit page of the person from the name', async ({ page }) => {
    const person = {
      name: uniqueName('Nome E2E'),
      email: `nome.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);
    await searchFor(page, person.name);

    await page.getByRole('link', { name: person.name, exact: true }).click();

    await expect(page).toHaveURL(/\/pessoas\/[0-9a-f-]{36}\/editar$/);
    await expect(page.getByRole('heading', { name: 'Editar pessoa' })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Dados da pessoa' }).getByLabel('Nome completo'),
    ).toHaveValue(person.name);
  });
});

async function openEditForm(page: Page, name: string): Promise<void> {
  await searchFor(page, name);
  await page.getByRole('link', { name: `Editar ${name}` }).click();
  await expect(page).toHaveURL(/\/pessoas\/[0-9a-f-]{36}\/editar$/);
  await expect(page.getByRole('heading', { name: 'Editar pessoa' })).toBeVisible();
}

test.describe('Edit a person', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('opens the registration form filled with the person and saves the changes', async ({
    page,
  }) => {
    const person = {
      name: uniqueName('Edicao E2E'),
      email: `edicao.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);
    await openEditForm(page, person.name);
    const section = page.getByRole('region', { name: 'Dados da pessoa' });
    await expect(section.getByLabel('Nome completo')).toHaveValue(person.name);
    await expect(section.getByLabel('E-mail')).toHaveValue(person.email);
    await expect(section.getByLabel('CPF')).toHaveValue(formatCpf(person.cpf));

    const renamed = uniqueName('Editada E2E');
    await section.getByLabel('Nome completo').fill(renamed);
    await section.getByLabel('Telefone').fill('(11) 98888-7777');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page).toHaveURL(/\/pessoas\?search=/);
    await expect(page.getByText('Pessoa atualizada')).toBeVisible();
    await searchFor(page, renamed);
    const row = page.getByRole('row', { name: new RegExp(renamed) });
    await expect(row).toContainText('(11) 98888-7777');
    await expect(row).toContainText(person.email);
  });

  test('deactivates and reactivates the person from the edit page', async ({ page }) => {
    const person = {
      name: uniqueName('Situacao E2E'),
      email: `situacao.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);
    await openEditForm(page, person.name);
    await expect(page.getByText('Ativa', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Desativar pessoa' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desativar' }).click();

    await expect(page.getByText('Pessoa desativada')).toBeVisible();
    await expect(page.getByText('Inativa', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Reativar pessoa' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reativar' }).click();

    await expect(page.getByText('Pessoa reativada')).toBeVisible();
    await expect(page.getByText('Ativa', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Desativar pessoa' })).toBeVisible();
  });
});
