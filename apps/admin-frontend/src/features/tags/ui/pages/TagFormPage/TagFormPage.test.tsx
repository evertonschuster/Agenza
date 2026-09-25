import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { TagListPage } from '../TagListPage/TagListPage';
import { TagFormPage } from './TagFormPage';
import type { Tag } from '../../../model/tag';

const { mockList, mockGet, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, get: mockGet, create: mockCreate, update: mockUpdate },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function renderAt(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="tags" element={<TagListPage />}>
          <Route path="new" element={<TagFormPage />} />
          <Route path=":id/edit" element={<TagFormPage />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('TagFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: TAGS });
    mockGet.mockImplementation((id: string) => {
      const tag = TAGS.find((candidate) => candidate.id === id);
      return Promise.resolve(
        tag
          ? { ok: true, data: tag }
          : {
              ok: false,
              error: {
                status: 404,
                code: 'Tag.NotFound',
                title: `Etiqueta '${id}' não foi encontrada.`,
              },
            },
      );
    });
  });

  describe('create mode (/tags/new)', () => {
    it('opens with an empty form titled "Nova etiqueta"', async () => {
      renderAt(['/tags/new']);

      expect(await screen.findByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveValue('');
      expect(screen.getByLabelText('Descrição')).toHaveValue('');
    });

    it('blocks submission and shows inline errors when name and color are missing (spec US2 scenario 2)', async () => {
      const user = userEvent.setup();
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('O nome da etiqueta é obrigatório.')).toBeInTheDocument();
      expect(screen.getByText('A cor da etiqueta é obrigatória.')).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates the tag, refreshes the list and returns to /tags on success (spec US2 scenario 1)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      mockList.mockResolvedValue({
        ok: true,
        data: [...TAGS, { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null }],
      });
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Sazonal',
        color: '#0ea5e9',
        description: null,
      });
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('location: /tags'),
      );
      expect(await screen.findByText('Sazonal')).toBeInTheDocument();
    });

    it('shows saving feedback on the submit button while the request is in flight', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (result: { ok: true; data: Tag }) => void;
      mockCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const savingButton = await screen.findByRole('button', { name: 'Salvando…' });
      expect(savingButton).toBeDisabled();

      resolveCreate({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('location: /tags'),
      );
    });

    it('normalizes a whitespace-only description to null', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.type(screen.getByLabelText('Descrição'), '   ');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Sazonal',
          color: '#0ea5e9',
          description: null,
        }),
      );
    });

    it('shows a duplicate-name conflict verbatim as a form-level banner, without navigating away (spec US2 scenario 3)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          code: 'Tag.DuplicateName',
          title: "Já existe uma etiqueta chamada 'Promoção'.",
          errors: {
            '': [
              { code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'Promoção'." },
            ],
          },
        },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Promoção');
      await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Já existe uma etiqueta chamada 'Promoção'.",
      );
      expect(screen.getByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveValue('Promoção');
    });

    it('maps a backend field validation error to the matching input (spec FR-012)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: false,
        error: {
          status: 400,
          code: 'Validation.Failed',
          title: 'Ocorreram erros de validação.',
          errors: {
            Name: [{ code: 'NotEmptyValidator', message: 'O nome da etiqueta é obrigatório.' }],
          },
        },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'x');
      await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const nameError = await screen.findByText('O nome da etiqueta é obrigatório.');
      expect(nameError).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('closes without creating when Cancelar is clicked, preserving the active search', async () => {
      const user = userEvent.setup();
      renderAt(['/tags/new?q=promo']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(mockCreate).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('location: /tags?q=promo');
    });
  });

  describe('edit mode (/tags/:id/edit)', () => {
    it('shows a loading skeleton while the tag is being fetched, then reveals the form', async () => {
      const user = userEvent.setup();
      let resolveGet!: (result: { ok: true; data: Tag }) => void;
      mockGet.mockReturnValue(new Promise((resolve) => (resolveGet = resolve)));

      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));

      expect(await screen.findByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

      resolveGet({ ok: true, data: TAGS[0]! });

      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    });

    it('closes back to the list when Cancelar is clicked while still loading', async () => {
      const user = userEvent.setup();
      mockGet.mockReturnValue(new Promise(() => {}));

      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('location: /tags'),
      );
    });

    it('opens pre-filled with the fetched tag, titled "Editar etiqueta" (fresh from the backend, not the clicked row)', async () => {
      const user = userEvent.setup();
      renderAt(['/tags']);
      await screen.findByText('Promoção');

      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));

      expect(await screen.findByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      expect(screen.getByLabelText('Descrição')).toHaveValue('Desconto temporário');
      expect(screen.getByRole('radio', { name: 'Âmbar' })).toHaveAttribute('aria-checked', 'true');
      expect(mockGet).toHaveBeenCalledWith('1');
    });

    it('saves the change, refreshes the list and returns to /tags on success (spec US3 scenario 1)', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({
        ok: true,
        data: {
          id: '1',
          name: 'Promo relâmpago',
          color: '#f59e0b',
          description: 'Desconto temporário',
        },
      });
      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      const nameInput = await screen.findByLabelText('Nome');
      await user.clear(nameInput);
      await user.type(nameInput, 'Promo relâmpago');
      mockList.mockResolvedValue({
        ok: true,
        data: [
          {
            id: '1',
            name: 'Promo relâmpago',
            color: '#f59e0b',
            description: 'Desconto temporário',
          },
          TAGS[1],
        ],
      });
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mockUpdate).toHaveBeenCalledWith('1', {
        name: 'Promo relâmpago',
        color: '#f59e0b',
        description: 'Desconto temporário',
      });
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('location: /tags'),
      );
      expect(await screen.findByText('Promo relâmpago')).toBeInTheDocument();
    });

    it('shows a rename-to-duplicate conflict verbatim, without navigating away (spec US3 scenario 2)', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          code: 'Tag.DuplicateName',
          title: "Já existe uma etiqueta chamada 'VIP'.",
          errors: {
            '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'VIP'." }],
          },
        },
      });
      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      const nameInput = await screen.findByLabelText('Nome');
      await user.clear(nameInput);
      await user.type(nameInput, 'VIP');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Já existe uma etiqueta chamada 'VIP'.",
      );
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('shows a toast with the backend message and returns to the list on a real 404 (deep link, refresh, shared URL, or a tag deleted meanwhile)', async () => {
      const toastModule = await import('@/shared/ui/toast');
      const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
      renderAt(['/tags/missing-id/edit']);

      await waitFor(() =>
        expect(toastAddSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Não foi possível abrir a etiqueta',
            description: "Etiqueta 'missing-id' não foi encontrada.",
          }),
        ),
      );
      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('location: /tags'),
      );
    });
  });
});
