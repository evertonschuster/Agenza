import { test, expect, type Page } from '@playwright/test';
import { loginAsDemoUser, registerPeopleThroughApi } from './helpers';

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

  test('keeps the search in the URL, so it survives a reload', async ({ page }) => {
    const person = {
      name: uniqueName('Recarga E2E'),
      email: `recarga.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);

    await searchFor(page, person.name);
    await expect(page).toHaveURL(/\/pessoas\?q=/);
    await page.reload();

    await expect(page.getByLabel('Buscar pessoas por nome, e-mail ou CPF')).toHaveValue(
      person.name,
    );
    await expect(page.getByRole('row', { name: new RegExp(person.name) })).toBeVisible();
  });

  test('names a search that finds nobody and clears it', async ({ page }) => {
    await page.getByRole('link', { name: 'Pessoas' }).click();
    await expect(page).toHaveURL(/\/pessoas$/);
    const term = `inexistente-${Date.now()}`;

    await searchFor(page, term);

    await expect(page.getByText(`Nenhuma pessoa encontrada para «${term}»`)).toBeVisible();
    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(page).toHaveURL(/\/pessoas$/);
    await expect(page.getByLabel('Buscar pessoas por nome, e-mail ou CPF')).toHaveValue('');
    await expect(page.getByText(/Nenhuma pessoa encontrada para/)).toHaveCount(0);
  });

  test('opens the person details from the name, which still says it is coming', async ({
    page,
  }) => {
    const person = {
      name: uniqueName('Detalhe E2E'),
      email: `detalhe.${Date.now()}@example.com`,
      cpf: validCpf(),
    };
    await registerPerson(page, person);
    await searchFor(page, person.name);

    await page.getByRole('link', { name: person.name }).click();

    await expect(page).toHaveURL(/\/pessoas\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Detalhes da pessoa' })).toBeVisible();
    await expect(page.getByText('Em breve', { exact: true })).toBeVisible();
  });
});

const PAGED_PEOPLE = 25;
let pagedPrefix: string | undefined;

async function seedPagedPeople(page: Page): Promise<string> {
  if (pagedPrefix) return pagedPrefix;

  const prefix = `Paginacao E2E ${Date.now()}`;
  const names = Array.from(
    { length: PAGED_PEOPLE },
    (_, index) => `${prefix} ${String(index + 1).padStart(2, '0')}`,
  );
  await registerPeopleThroughApi(page, names);
  pagedPrefix = prefix;
  return prefix;
}

function pagingSummary(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Exibindo' });
}

function pageSizeSelect(page: Page) {
  return page.getByRole('combobox', { name: 'Itens por página' });
}

test.describe('People list paging', () => {
  let prefix: string;

  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    prefix = await seedPagedPeople(page);
    await page.goto(`/pessoas?q=${encodeURIComponent(prefix)}`);
    await expect(pagingSummary(page)).toHaveText(`Exibindo 1–20 de ${PAGED_PEOPLE} pessoas`);
  });

  test('moves between pages with Anterior and Próxima, keeping the search', async ({ page }) => {
    await expect(page.getByRole('row')).toHaveCount(21);

    await page.getByRole('button', { name: 'Próxima' }).click();

    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);
    await expect(page.getByRole('row')).toHaveCount(6);
    await expect(page).toHaveURL(/q=Paginacao\+E2E\+\d+&page=2$/);
    await expect(page.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await page.getByRole('button', { name: 'Anterior' }).click();

    await expect(pagingSummary(page)).toHaveText(`Exibindo 1–20 de ${PAGED_PEOPLE} pessoas`);
    await expect(page).not.toHaveURL(/page=/);
  });

  test('goes straight to a numbered page', async ({ page }) => {
    await page.getByRole('button', { name: 'Ir para a página 2' }).click();

    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('changes the items per page and starts again from the first page', async ({ page }) => {
    await page.goto(`/pessoas?q=${encodeURIComponent(prefix)}&page=2`);
    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);

    await pageSizeSelect(page).click();
    await page.getByRole('option', { name: '10', exact: true }).click();

    await expect(pagingSummary(page)).toHaveText(`Exibindo 1–10 de ${PAGED_PEOPLE} pessoas`);
    await expect(page.getByRole('row')).toHaveCount(11);
    await expect(page).toHaveURL(/pageSize=10$/);
    await expect(page.getByRole('button', { name: 'Ir para a página 3' })).toBeVisible();
  });

  test('keeps the page in the URL, so it survives a reload, and Back returns to the one before', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Próxima' }).click();
    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);

    await page.reload();
    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);

    await page.goBack();
    await expect(pagingSummary(page)).toHaveText(`Exibindo 1–20 de ${PAGED_PEOPLE} pessoas`);
  });

  test('sends a page that does not exist to the last one that does', async ({ page }) => {
    await page.goto(`/pessoas?q=${encodeURIComponent(prefix)}&page=99`);

    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);
    await expect(page).toHaveURL(/page=2$/);
    await expect(page.getByText('Nenhuma pessoa ainda')).toHaveCount(0);
  });

  test('starts over on the first page when the search changes', async ({ page }) => {
    await page.getByRole('button', { name: 'Próxima' }).click();
    await expect(pagingSummary(page)).toHaveText(`Exibindo 21–25 de ${PAGED_PEOPLE} pessoas`);

    await searchFor(page, `${prefix} 07`);

    await expect(pagingSummary(page)).toHaveText('Exibindo 1 de 1 pessoa');
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.getByRole('row', { name: new RegExp(`${prefix} 07`) })).toBeVisible();
  });
});
