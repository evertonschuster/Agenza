import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { toast } from '@/shared/ui/toast';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { utcDate } from '@/shared/format/date';
import type { Client } from '../../../model/client';
import { ClientFormPage } from './ClientFormPage';

const { mockCreate, mockGet, mockUpdate, mockDeactivate, mockReactivate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockGet: vi.fn(),
  mockUpdate: vi.fn(),
  mockDeactivate: vi.fn(),
  mockReactivate: vi.fn(),
}));

vi.mock('../../../api/clientsRepository', () => ({
  clientsRepository: {
    create: mockCreate,
    get: mockGet,
    update: mockUpdate,
    deactivate: mockDeactivate,
    reactivate: mockReactivate,
  },
}));

const CREATED: Client = {
  id: '0197f2a0-0000-7000-8000-0000000000aa',
  fullName: 'Maria Souza',
  birthDate: null,
  phone: null,
  email: null,
  cpf: null,
  administrativeNotes: null,
  status: 'active',
  guardians: [],
  referenceContacts: [],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pessoas/nova']}>
      <Routes>
        <Route path="/pessoas/nova" element={<ClientFormPage />} />
        <Route path="/pessoas" element={<h1>Lista de pessoas</h1>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function problem(overrides: Partial<ApiProblem>): { ok: false; error: ApiProblem } {
  return {
    ok: false,
    error: { status: 400, title: 'Ocorreram erros de validação.', ...overrides },
  };
}

function lastPayload() {
  return mockCreate.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

describe('ClientFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
    mockCreate.mockResolvedValue({ ok: true, data: CREATED });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('layout', () => {
    it('opens as a full page with the person fields and both contact sections', () => {
      renderPage();

      expect(screen.getByRole('heading', { name: 'Nova pessoa' })).toBeInTheDocument();
      for (const label of [
        'Nome completo',
        'Data de nascimento',
        'Telefone',
        'E-mail',
        'CPF',
        'Observações administrativas',
      ]) {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      }
      expect(screen.getByRole('heading', { name: 'Responsáveis' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pessoas de referência' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Adicionar responsável' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Adicionar pessoa de referência' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/pessoas');
    });

    it('shows where the page sits with a breadcrumb back to Pessoas', () => {
      renderPage();

      const trail = within(screen.getByRole('navigation', { name: 'Caminho de navegação' }));
      expect(trail.getByRole('link', { name: 'Pessoas' })).toHaveAttribute('href', '/pessoas');
      expect(trail.getByRole('heading', { name: 'Nova pessoa', level: 1 })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('names the person section for assistive tech without showing a heading', () => {
      renderPage();

      const person = screen.getByRole('region', { name: 'Dados da pessoa' });
      expect(within(person).getByRole('heading', { name: 'Dados da pessoa' })).toHaveClass(
        'sr-only',
      );
      expect(screen.queryByText(/Só o nome é obrigatório/)).not.toBeInTheDocument();
    });

    it('warns that notes are administrative only', () => {
      renderPage();

      expect(screen.getByText(/Não registre prontuário, diagnóstico/)).toBeInTheDocument();
    });

    it('starts with no contacts and never asks whether the person is a minor', () => {
      renderPage();

      expect(screen.queryByRole('group', { name: /^Responsável \d$/ })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: /^Pessoa de referência \d$/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('registering an adult or a person without a birth date', () => {
    it('saves a person described only by the name, then returns to the Pessoas area', async () => {
      const user = userEvent.setup();
      const toastAdd = vi.spyOn(toast, 'add');
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), '  Maria Souza  ');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/pessoas'));
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(lastPayload()).toEqual({
        fullName: 'Maria Souza',
        birthDate: null,
        phone: null,
        email: null,
        cpf: null,
        administrativeNotes: null,
        guardians: [],
        referenceContacts: [],
      });
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pessoa cadastrada',
          description: 'O cadastro de Maria Souza foi criado.',
          type: 'success',
        }),
      );
      expect(await screen.findByRole('heading', { name: 'Lista de pessoas' })).toBeInTheDocument();
    });

    it('sends every field normalized: birth date as a Date, CPF without mask, lowercase e-mail', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), '20051990');
      await user.type(screen.getByLabelText('Telefone'), '(11) 99999-0000');
      await user.type(screen.getByLabelText('E-mail'), 'Maria.Souza@Example.COM');
      await user.type(screen.getByLabelText('CPF'), '52998224725');
      await user.type(
        screen.getByLabelText('Observações administrativas'),
        'Prefere contato pela manhã.',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toEqual({
        fullName: 'Maria Souza',
        birthDate: utcDate(1990, 5, 20),
        phone: '(11) 99999-0000',
        email: 'maria.souza@example.com',
        cpf: '52998224725',
        administrativeNotes: 'Prefere contato pela manhã.',
        guardians: [],
        referenceContacts: [],
      });
    });

    it('masks the CPF and the birth date while they are typed and shows the calculated age', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('CPF'), '52998224725');
      await user.type(screen.getByLabelText('Data de nascimento'), '20051990');

      expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
      expect(screen.getByLabelText('Data de nascimento')).toHaveValue('20/05/1990');
      expect(screen.getByText('36 anos')).toBeInTheDocument();
    });

    it('clears the birth date, drops the age and sends no birth date', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), '20051990');
      expect(screen.getByText('36 anos')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Limpar data' }));

      expect(screen.getByLabelText('Data de nascimento')).toHaveValue('');
      expect(screen.queryByText('36 anos')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toMatchObject({ birthDate: null });
    });

    it('picks the birth date from the calendar, shows the age and sends the date', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.click(screen.getByRole('button', { name: 'Abrir calendário' }));
      const calendar = await screen.findByRole('dialog');
      await user.selectOptions(
        within(calendar).getByRole('combobox', { name: 'Escolha o ano' }),
        '1990',
      );
      await user.selectOptions(
        within(calendar).getByRole('combobox', { name: 'Escolha o mês' }),
        '4',
      );
      await user.click(within(calendar).getByRole('button', { name: /, 20 de maio de 1990/ }));

      expect(screen.getByLabelText('Data de nascimento')).toHaveValue('20/05/1990');
      expect(screen.getByText('36 anos')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toMatchObject({ birthDate: utcDate(1990, 5, 20) });
    });

    it('does not let the calendar pick today or later as a birth date', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Abrir calendário' }));
      const calendar = await screen.findByRole('dialog');

      expect(
        within(calendar).getByRole('button', { name: /, 1 de outubro de 2026/ }),
      ).toBeEnabled();
      expect(
        within(calendar).getByRole('button', { name: /, 2 de outubro de 2026/ }),
      ).toBeDisabled();
    });

    it('does not demand a guardian for an adult', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), '02102008');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('local validation', () => {
    it('blocks the submit and explains the missing name', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('O nome completo é obrigatório.')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('keeps what was typed while reporting field errors in pt-BR', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('Telefone'), 'telefone');
      await user.type(screen.getByLabelText('E-mail'), 'maria@example');
      await user.type(screen.getByLabelText('CPF'), '52998224724');
      await user.type(screen.getByLabelText('Data de nascimento'), '31022020');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
      expect(screen.getByText('Informe um CPF válido.')).toBeInTheDocument();
      expect(screen.getByText(/Informe um telefone válido/)).toBeInTheDocument();
      expect(
        screen.getByText('Informe uma data válida no formato dd/mm/aaaa.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Souza');
      expect(screen.getByLabelText('E-mail')).toHaveValue('maria@example');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it.each([
      ['02102026', 'A data de nascimento deve estar no passado.'],
      ['01011905', 'A data de nascimento não pode indicar idade superior a 120 anos.'],
    ])('rejects the birth date %s', async (digits, message) => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), digits);
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('minors and their guardians', () => {
    it('says a guardian is needed as soon as the birth date indicates a minor', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Data de nascimento'), '10032015');

      expect(screen.getByRole('status')).toHaveTextContent(
        'Esta pessoa tem menos de 18 anos. Informe ao menos um responsável.',
      );
    });

    it('refuses to save a minor without a guardian and keeps the form', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Joana Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), '10032015');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Informe ao menos um responsável para pessoas menores de 18 anos.',
      );
      expect(mockCreate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Joana Souza');
    });

    it('keeps focus on the first invalid field when something else is wrong too', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Data de nascimento'), '10032015');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await screen.findByText('O nome completo é obrigatório.');
      expect(screen.getByLabelText('Nome completo')).toHaveFocus();
    });

    it('reports the missing guardian on the same submit as the other errors', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Data de nascimento'), '10032015');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('O nome completo é obrigatório.')).toBeInTheDocument();
      expect(
        screen.getByText('Informe ao menos um responsável para pessoas menores de 18 anos.'),
      ).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('stops offering more guardians at the limit', async () => {
      const user = userEvent.setup();
      renderPage();
      const add = screen.getByRole('button', { name: 'Adicionar responsável' });

      for (let count = 0; count < 10; count += 1) await user.click(add);

      expect(screen.getAllByRole('group', { name: /^Responsável \d+$/ })).toHaveLength(10);
      expect(add).toBeDisabled();
    });

    it('saves a minor once a valid guardian is informed', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Joana Souza');
      await user.type(screen.getByLabelText('Data de nascimento'), '10032015');
      await user.click(screen.getByRole('button', { name: 'Adicionar responsável' }));

      const guardian = within(screen.getByRole('group', { name: 'Responsável 1' }));
      await user.type(guardian.getByLabelText('Nome'), 'Ana Souza');
      await user.type(guardian.getByLabelText('Vínculo'), 'Mãe');
      await user.type(guardian.getByLabelText('Telefone'), '11 98888-0000');
      await user.type(guardian.getByLabelText('CPF'), '12345678909');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toMatchObject({
        birthDate: utcDate(2015, 3, 10),
        guardians: [
          { name: 'Ana Souza', relationship: 'Mãe', phone: '11 98888-0000', cpf: '12345678909' },
        ],
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('reports a guardian missing name and relationship on that guardian', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Joana Souza');
      await user.click(screen.getByRole('button', { name: 'Adicionar responsável' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const guardian = within(await screen.findByRole('group', { name: 'Responsável 1' }));
      expect(await guardian.findByText('O nome do responsável é obrigatório.')).toBeInTheDocument();
      expect(guardian.getByText('O vínculo do responsável é obrigatório.')).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('lets a guardian be removed from the form', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.click(screen.getByRole('button', { name: 'Adicionar responsável' }));
      await user.click(screen.getByRole('button', { name: 'Adicionar responsável' }));
      expect(screen.getAllByRole('group', { name: /^Responsável \d$/ })).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: 'Remover responsável 1' }));

      expect(screen.getAllByRole('group', { name: /^Responsável \d$/ })).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Remover responsável 1' }));
      expect(screen.queryByRole('group', { name: /^Responsável \d$/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toMatchObject({ guardians: [] });
    });
  });

  describe('reference contacts', () => {
    async function addReferenceContact(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Adicionar pessoa de referência' }));
      return within(screen.getByRole('group', { name: 'Pessoa de referência 1' }));
    }

    it('requires at least one purpose', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      const contact = await addReferenceContact(user);
      await user.type(contact.getByLabelText('Nome'), 'Carlos Lima');
      await user.type(contact.getByLabelText('Vínculo'), 'Tio');

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        await contact.findByText('Informe ao menos uma finalidade para a pessoa de referência.'),
      ).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('offers the three purposes and sends the chosen ones', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      const contact = await addReferenceContact(user);
      await user.type(contact.getByLabelText('Nome'), 'Carlos Lima');
      await user.type(contact.getByLabelText('Vínculo'), 'Tio');
      await user.type(contact.getByLabelText('Telefone'), '11 4000-1000');

      expect(
        contact.getAllByRole('checkbox').map((box) => box.getAttribute('aria-checked')),
      ).toEqual(['false', 'false', 'false']);
      await user.click(contact.getByRole('checkbox', { name: 'Emergência' }));
      await user.click(contact.getByRole('checkbox', { name: 'Comunicação cotidiana' }));
      expect(contact.getByRole('checkbox', { name: 'Apoio operacional' })).not.toBeChecked();
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lastPayload()).toMatchObject({
        guardians: [],
        referenceContacts: [
          {
            name: 'Carlos Lima',
            relationship: 'Tio',
            phone: '11 4000-1000',
            purposes: ['emergency', 'dailyCommunication'],
          },
        ],
      });
    });

    it('keeps the contact separate from the person: it never becomes a guardian', async () => {
      const user = userEvent.setup();
      renderPage();

      await addReferenceContact(user);

      expect(screen.queryByRole('group', { name: 'Responsável 1' })).not.toBeInTheDocument();
    });

    it('lets a reference contact be removed', async () => {
      const user = userEvent.setup();
      renderPage();
      await addReferenceContact(user);

      await user.click(screen.getByRole('button', { name: 'Remover pessoa de referência 1' }));

      expect(
        screen.queryByRole('group', { name: 'Pessoa de referência 1' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('backend responses', () => {
    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.type(screen.getByLabelText('CPF'), '52998224725');
      await user.type(screen.getByLabelText('E-mail'), 'maria@example.com');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
    }

    it('shows the duplicate CPF message on the CPF field and focuses it', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue(
        problem({
          status: 409,
          code: 'Client.DuplicateCpf',
          title: 'Já existe uma pessoa cadastrada com este CPF.',
          errors: {
            Cpf: [
              {
                code: 'Client.DuplicateCpf',
                message: 'Já existe uma pessoa cadastrada com este CPF.',
              },
            ],
          },
        }),
      );
      renderPage();

      await fillAndSubmit(user);

      expect(
        await screen.findByText('Já existe uma pessoa cadastrada com este CPF.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-invalid', 'true');
      await waitFor(() => expect(screen.getByLabelText('CPF')).toHaveFocus());
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Souza');
      expect(screen.getByLabelText('E-mail')).toHaveValue('maria@example.com');
      expect(screen.getByTestId('location')).toHaveTextContent('/pessoas/nova');
    });

    it('shows a duplicate e-mail on the e-mail field and keeps everything typed', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue(
        problem({
          status: 409,
          code: 'Client.DuplicateEmail',
          errors: {
            Email: [
              {
                code: 'Client.DuplicateEmail',
                message: 'Já existe uma pessoa ativa cadastrada com este e-mail.',
              },
            ],
          },
        }),
      );
      renderPage();

      await fillAndSubmit(user);

      expect(
        await screen.findByText('Já existe uma pessoa ativa cadastrada com este e-mail.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
    });

    it('maps indexed backend errors to the matching contact field', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue(
        problem({
          code: 'Validation.Failed',
          errors: {
            'Guardians[0].Name': [{ message: 'O nome do responsável é obrigatório.' }],
            'ReferenceContacts[0].Purposes': [{ message: 'Informe ao menos uma finalidade.' }],
          },
        }),
      );
      renderPage();
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.click(screen.getByRole('button', { name: 'Adicionar responsável' }));
      const guardian = within(screen.getByRole('group', { name: 'Responsável 1' }));
      await user.type(guardian.getByLabelText('Nome'), 'Ana');
      await user.type(guardian.getByLabelText('Vínculo'), 'Mãe');
      await user.click(screen.getByRole('button', { name: 'Adicionar pessoa de referência' }));
      const contact = within(screen.getByRole('group', { name: 'Pessoa de referência 1' }));
      await user.type(contact.getByLabelText('Nome'), 'Carlos');
      await user.type(contact.getByLabelText('Vínculo'), 'Tio');
      await user.click(contact.getByRole('checkbox', { name: 'Emergência' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await guardian.findByText('O nome do responsável é obrigatório.')).toBeInTheDocument();
      expect(guardian.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
      expect(contact.getByText('Informe ao menos uma finalidade.')).toBeInTheDocument();
      expect(guardian.getByLabelText('Nome')).toHaveValue('Ana');
    });

    it('shows an error with no field in a banner and keeps the form', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue(
        problem({
          status: 0,
          code: 'Network.Unreachable',
          title: 'Sem conexão com o servidor. Tente novamente.',
        }),
      );
      renderPage();

      await fillAndSubmit(user);

      const banner = await screen.findByRole('alert');
      expect(banner).toHaveTextContent('Sem conexão com o servidor. Tente novamente.');
      expect(
        banner.compareDocumentPosition(screen.getByRole('button', { name: 'Salvar' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen
          .getByRole('heading', { name: 'Pessoas de referência' })
          .compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Souza');
      expect(screen.getByTestId('location')).toHaveTextContent('/pessoas/nova');
    });

    it('can be submitted again after fixing the problem', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValueOnce(
        problem({
          status: 409,
          code: 'Client.DuplicateEmail',
          errors: {
            Email: [{ message: 'Já existe uma pessoa ativa cadastrada com este e-mail.' }],
          },
        }),
      );
      renderPage();
      await fillAndSubmit(user);
      await screen.findByText('Já existe uma pessoa ativa cadastrada com este e-mail.');

      await user.clear(screen.getByLabelText('E-mail'));
      await user.type(screen.getByLabelText('E-mail'), 'outro@example.com');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/pessoas'));
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(lastPayload()).toMatchObject({ email: 'outro@example.com' });
    });
  });

  describe('while saving', () => {
    it('shows progress, locks the exits and sends the request only once', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (value: unknown) => void;
      mockCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
      renderPage();
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const saving = await screen.findByRole('button', { name: 'Salvando…' });
      expect(saving).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.queryByRole('link', { name: 'Cancelar' })).not.toBeInTheDocument();
      await user.click(saving);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      resolveCreate({ ok: true, data: CREATED });
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/pessoas'));
    });

    it('stays where the person went when they leave while the save is still in flight', async () => {
      const user = userEvent.setup();
      const toastAdd = vi.spyOn(toast, 'add');
      let resolveCreate!: (value: unknown) => void;
      mockCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
      render(
        <MemoryRouter initialEntries={['/pessoas/nova']}>
          <Link to="/agenda">Agenda</Link>
          <Routes>
            <Route path="/pessoas/nova" element={<ClientFormPage />} />
            <Route path="/pessoas" element={<h1>Lista de pessoas</h1>} />
            <Route path="/agenda" element={<h1>Agenda</h1>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>,
      );
      await user.type(screen.getByLabelText('Nome completo'), 'Maria Souza');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await screen.findByRole('button', { name: 'Salvando…' });

      await user.click(screen.getByRole('link', { name: 'Agenda' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/agenda');

      resolveCreate({ ok: true, data: CREATED });
      await waitFor(() =>
        expect(toastAdd).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Pessoa cadastrada' }),
        ),
      );

      expect(screen.getByTestId('location')).toHaveTextContent('/agenda');
      expect(screen.queryByRole('heading', { name: 'Lista de pessoas' })).not.toBeInTheDocument();
    });
  });

  it('offers no situation change: a person only gets one once saved', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /Desativar|Reativar/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Ativa')).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

const EXISTING: Client = {
  id: 'c1',
  fullName: 'Lia Souza',
  birthDate: '2016-06-15',
  phone: '(11) 91234-5678',
  email: 'lia@example.com',
  cpf: '52998224725',
  administrativeNotes: 'Prefere contato pela manhã.',
  status: 'active',
  guardians: [{ id: 'g1', name: 'Ana Souza', relationship: 'Mãe', phone: null, cpf: null }],
  referenceContacts: [
    { id: 'r1', name: 'Carlos Lima', relationship: 'Tio', phone: null, purposes: ['emergency'] },
  ],
};

function renderEditPage() {
  return render(
    <MemoryRouter initialEntries={['/pessoas/c1/editar']}>
      <Routes>
        <Route path="/pessoas/:id/editar" element={<ClientFormPage />} />
        <Route path="/pessoas" element={<h1>Lista de pessoas</h1>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => (resolve = settle));
  return { promise, resolve };
}

describe('ClientFormPage, editing a person', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
    mockGet.mockResolvedValue({ ok: true, data: EXISTING });
    mockUpdate.mockImplementation((id: string, input: object) =>
      Promise.resolve({ ok: true, data: { ...EXISTING, ...input, id } }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading the person', () => {
    it('holds the fields and the save back until the person arrives, offering no situation change yet', () => {
      mockGet.mockReturnValue(deferred<unknown>().promise);
      renderEditPage();

      expect(screen.getByRole('heading', { name: 'Editar pessoa' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Desativar pessoa' })).not.toBeInTheDocument();
      expect(mockGet).toHaveBeenCalledWith('c1', expect.any(AbortSignal));
    });

    it('fills the same form with what is saved: masked CPF and birth date, contacts included', async () => {
      renderEditPage();

      expect(await screen.findByLabelText('Nome completo')).toHaveValue('Lia Souza');
      const person = within(screen.getByRole('region', { name: 'Dados da pessoa' }));
      expect(person.getByLabelText('Data de nascimento')).toHaveValue('15/06/2016');
      expect(person.getByLabelText('Telefone')).toHaveValue('(11) 91234-5678');
      expect(person.getByLabelText('E-mail')).toHaveValue('lia@example.com');
      expect(person.getByLabelText('CPF')).toHaveValue('529.982.247-25');
      expect(person.getByLabelText('Observações administrativas')).toHaveValue(
        'Prefere contato pela manhã.',
      );
      const guardian = screen.getByRole('group', { name: 'Responsável 1' });
      expect(within(guardian).getByLabelText('Nome')).toHaveValue('Ana Souza');
      const reference = screen.getByRole('group', { name: 'Pessoa de referência 1' });
      expect(within(reference).getByLabelText('Nome')).toHaveValue('Carlos Lima');
      expect(within(reference).getByRole('checkbox', { name: 'Emergência' })).toBeChecked();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
      expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/pessoas');
    });

    it('shows the current situation next to the title', async () => {
      renderEditPage();

      await screen.findByLabelText('Nome completo');
      expect(screen.getByText('Ativa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Desativar pessoa' })).toBeEnabled();
    });

    it('tells why the person could not be opened and goes back to the Pessoas list', async () => {
      const serverError = vi.spyOn(toast, 'serverError');
      const error = { status: 404, code: 'Client.NotFound', title: 'A pessoa não foi encontrada.' };
      mockGet.mockResolvedValue({ ok: false, error });
      renderEditPage();

      expect(await screen.findByRole('heading', { name: 'Lista de pessoas' })).toBeInTheDocument();
      expect(serverError).toHaveBeenCalledWith('Não foi possível abrir a pessoa', error);
    });

    it('ignores an answer that arrives after the person has left the page', async () => {
      const serverError = vi.spyOn(toast, 'serverError');
      const pending = deferred<unknown>();
      mockGet.mockReturnValue(pending.promise);
      const { unmount } = renderEditPage();

      unmount();
      pending.resolve({ ok: false, error: { status: 500, title: 'Falhou.' } });
      await pending.promise;

      expect(serverError).not.toHaveBeenCalled();
    });
  });

  describe('saving the changes', () => {
    it('sends the whole person to the update, never creates one, and returns to the list', async () => {
      const user = userEvent.setup();
      const toastAdd = vi.spyOn(toast, 'add');
      renderEditPage();
      await screen.findByLabelText('Nome completo');
      const phone = within(screen.getByRole('region', { name: 'Dados da pessoa' })).getByLabelText(
        'Telefone',
      );

      await user.clear(phone);
      await user.type(phone, '(11) 99999-0000');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/pessoas$/));
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledExactlyOnceWith('c1', {
        fullName: 'Lia Souza',
        birthDate: utcDate(2016, 6, 15),
        phone: '(11) 99999-0000',
        email: 'lia@example.com',
        cpf: '52998224725',
        administrativeNotes: 'Prefere contato pela manhã.',
        guardians: [{ name: 'Ana Souza', relationship: 'Mãe', phone: null, cpf: null }],
        referenceContacts: [
          { name: 'Carlos Lima', relationship: 'Tio', phone: null, purposes: ['emergency'] },
        ],
      });
      expect(toastAdd).toHaveBeenCalledWith({
        title: 'Pessoa atualizada',
        description: 'O cadastro de Lia Souza foi atualizado.',
        type: 'success',
      });
    });

    it('sends the contacts as they are left in the form, so a removed guardian is gone', async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ ok: true, data: { ...EXISTING, birthDate: '1990-01-01' } });
      renderEditPage();
      const guardian = await screen.findByRole('group', { name: 'Responsável 1' });

      await user.click(within(guardian).getByRole('button', { name: /Remover/ }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0]?.[1]).toMatchObject({ guardians: [] });
    });

    it('still asks for a guardian when the saved person is a minor and it was removed', async () => {
      const user = userEvent.setup();
      renderEditPage();
      const guardian = await screen.findByRole('group', { name: 'Responsável 1' });

      await user.click(within(guardian).getByRole('button', { name: /Remover/ }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Informe ao menos um responsável para pessoas menores de 18 anos.',
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('shows a backend conflict on its field and stays on the page with what was typed', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue(
        problem({
          status: 409,
          code: 'Client.DuplicateEmail',
          title: 'Já existe uma pessoa ativa cadastrada com este e-mail.',
          errors: {
            Email: [
              {
                code: 'Client.DuplicateEmail',
                message: 'Já existe uma pessoa ativa cadastrada com este e-mail.',
              },
            ],
          },
        }),
      );
      renderEditPage();
      const email = await screen.findByLabelText('E-mail');

      await user.clear(email);
      await user.type(email, 'outra@example.com');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        await screen.findByText('Já existe uma pessoa ativa cadastrada com este e-mail.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveValue('outra@example.com');
      expect(screen.getByTestId('location')).toHaveTextContent('/pessoas/c1/editar');
    });

    it('does not let the situation change while the save is in flight', async () => {
      const user = userEvent.setup();
      mockUpdate.mockReturnValue(deferred<unknown>().promise);
      renderEditPage();
      await screen.findByLabelText('Nome completo');

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await screen.findByRole('button', { name: 'Salvando…' });
      expect(screen.getByRole('button', { name: 'Desativar pessoa' })).toBeDisabled();
    });
  });

  describe('changing the situation', () => {
    it('asks before deactivating, then shows the person as inactive without losing what was typed', async () => {
      const user = userEvent.setup();
      const toastAdd = vi.spyOn(toast, 'add');
      mockDeactivate.mockResolvedValue({ ok: true, data: { ...EXISTING, status: 'inactive' } });
      renderEditPage();
      const name = await screen.findByLabelText('Nome completo');
      await user.clear(name);
      await user.type(name, 'Lia Souza Lima');

      await user.click(screen.getByRole('button', { name: 'Desativar pessoa' }));
      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Desativar pessoa?' }),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/Lia Souza deixa de aparecer/)).toBeInTheDocument();
      const confirm = within(dialog).getByRole('button', { name: 'Desativar' });
      expect(confirm).toHaveAttribute('data-variant', 'destructive');
      expect(mockDeactivate).not.toHaveBeenCalled();

      await user.click(confirm);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockDeactivate).toHaveBeenCalledExactlyOnceWith('c1');
      expect(mockReactivate).not.toHaveBeenCalled();
      expect(screen.getByText('Inativa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reativar pessoa' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome completo')).toHaveValue('Lia Souza Lima');
      expect(toastAdd).toHaveBeenCalledWith({
        title: 'Pessoa desativada',
        description: 'O cadastro de Lia Souza foi desativado.',
        type: 'success',
      });
    });

    it('reactivates an inactive person with a plain confirm button', async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ ok: true, data: { ...EXISTING, status: 'inactive' } });
      mockReactivate.mockResolvedValue({ ok: true, data: EXISTING });
      renderEditPage();
      await screen.findByLabelText('Nome completo');
      expect(screen.getByText('Inativa')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Reativar pessoa' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Reativar pessoa?' })).toBeInTheDocument();
      const confirm = within(dialog).getByRole('button', { name: 'Reativar' });
      expect(confirm).toHaveAttribute('data-variant', 'default');
      await user.click(confirm);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockReactivate).toHaveBeenCalledExactlyOnceWith('c1');
      expect(screen.getByText('Ativa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Desativar pessoa' })).toBeInTheDocument();
    });

    it('explains a reactivation the backend refuses and keeps the person inactive', async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ ok: true, data: { ...EXISTING, status: 'inactive' } });
      mockReactivate.mockResolvedValue(
        problem({
          status: 409,
          code: 'Client.DuplicateCpf',
          title: 'Não é possível reativar esta pessoa porque outra pessoa já usa este CPF.',
        }),
      );
      renderEditPage();
      await screen.findByLabelText('Nome completo');

      await user.click(screen.getByRole('button', { name: 'Reativar pessoa' }));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reativar' }),
      );

      const dialog = await screen.findByRole('dialog');
      expect(
        await within(dialog).findByRole('heading', { name: 'Não é possível reativar' }),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/outra pessoa já usa este CPF/)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Entendi' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByText('Inativa')).toBeInTheDocument();
    });

    it('changes nothing when the person cancels the confirmation', async () => {
      const user = userEvent.setup();
      renderEditPage();
      await screen.findByLabelText('Nome completo');

      await user.click(screen.getByRole('button', { name: 'Desativar pessoa' }));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
      );

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mockDeactivate).not.toHaveBeenCalled();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
    });
  });
});
