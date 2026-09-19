import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { loader } from '../TagListPage/route';
import { TagFormPage } from './TagFormPage';
import type { Tag } from '../../../model/tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const { mockList, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, create: mockCreate, update: mockUpdate, remove: vi.fn() },
}));

const EXISTING_TAG: Tag = {
  id: 'tag-1',
  name: 'VIP',
  color: '#8b5cf6',
  description: 'Clientes premium',
};

function buildRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: '/tags',
        id: 'tags-list',
        Component: () => <Outlet />,
        loader,
        children: [
          { path: 'new', Component: TagFormPage },
          { path: ':id/edit', Component: TagFormPage },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );
}

describe('TagFormPage — create (route: /tags/new)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: [] });
  });

  function renderCreate() {
    const router = buildRouter('/tags/new');
    render(<RouterProvider router={router} />);
    return router;
  }

  it('blocks submission and shows the exact backend-style message when the name is empty (spec FR-005)', async () => {
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O nome da etiqueta é obrigatório.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('blocks submission when no color is selected (spec FR-003)', async () => {
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A cor da etiqueta é obrigatória.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a tag, shows a success toast, navigates back to /tags, and revalidates the list (spec US2)', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      ok: true,
      data: { id: 'new-id', name: 'Promoção', color: '#f59e0b', description: null },
    });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const router = renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etiqueta criada',
        description: '"Promoção" foi adicionada ao catálogo.',
        type: 'success',
      }),
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('shows the exact backend conflict message and stays on /tags/new on a duplicate name (spec FR-004, FR-012)', async () => {
    const user = userEvent.setup();
    const conflict: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Já existe uma etiqueta chamada 'VIP'.",
      status: 409,
      code: 'Tag.DuplicateName',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'VIP'." }],
      },
    };
    mockCreate.mockResolvedValue({ ok: false, error: conflict });
    const router = renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.type(screen.getByLabelText('Nome'), 'VIP');
    await user.click(screen.getByRole('radio', { name: 'Violeta' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText("Já existe uma etiqueta chamada 'VIP'.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tags/new');
  });

  it('keeps the typed values on screen when the connection fails (edge case)', async () => {
    const user = userEvent.setup();
    const networkProblem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };
    mockCreate.mockResolvedValue({ ok: false, error: networkProblem });
    renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Sem conexão com o servidor. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Promoção');
  });

  it('navigating back via Cancelar returns to /tags without creating anything', async () => {
    const user = userEvent.setup();
    const router = renderCreate();
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('TagFormPage — edit (route: /tags/:id/edit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: [EXISTING_TAG] });
  });

  function renderEdit(id = EXISTING_TAG.id) {
    const router = buildRouter(`/tags/${id}/edit`);
    render(<RouterProvider router={router} />);
    return router;
  }

  it('pre-fills the fields when editing an existing tag (spec US3)', async () => {
    renderEdit();

    expect(await screen.findByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('VIP');
    expect(screen.getByRole('radio', { name: 'Violeta' })).toBeChecked();
  });

  it('edits a tag, shows a success toast worded for an update, and navigates back (spec US3)', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({ ok: true, data: EXISTING_TAG });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const router = renderEdit();
    await screen.findByRole('heading', { name: 'Editar etiqueta' });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
    expect(mockUpdate).toHaveBeenCalledWith('tag-1', {
      name: 'VIP',
      color: '#8b5cf6',
      description: 'Clientes premium',
    });
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etiqueta atualizada',
        description: '"VIP" foi atualizada.',
        type: 'success',
      }),
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('shows the not-found message without crashing when the tag is removed by someone else during submit (edge case, spec FR-012)', async () => {
    const user = userEvent.setup();
    const notFound: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Etiqueta 'tag-1' não foi encontrada.",
      status: 404,
      code: 'Tag.NotFound',
      errors: { '': [{ code: 'Tag.NotFound', message: "Etiqueta 'tag-1' não foi encontrada." }] },
    };
    mockUpdate.mockResolvedValue({ ok: false, error: notFound });
    renderEdit();
    await screen.findByRole('heading', { name: 'Editar etiqueta' });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText("Etiqueta 'tag-1' não foi encontrada.")).toBeInTheDocument();
  });

  it('blocks a rename that collides with another tag, without saving (spec FR-006)', async () => {
    const user = userEvent.setup();
    const conflict: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Já existe uma etiqueta chamada 'Promoção'.",
      status: 409,
      code: 'Tag.DuplicateName',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'Promoção'." }],
      },
    };
    mockUpdate.mockResolvedValue({ ok: false, error: conflict });
    const router = renderEdit();
    await screen.findByRole('heading', { name: 'Editar etiqueta' });

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText("Já existe uma etiqueta chamada 'Promoção'."),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/tags/${EXISTING_TAG.id}/edit`);
  });

  it('shows the not-found dialog, not a crash, when the id is not in the loaded list', async () => {
    const router = renderEdit('missing-id');

    expect(
      await screen.findByRole('heading', { name: 'Etiqueta não encontrada' }),
    ).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar para a lista' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
  });
});
