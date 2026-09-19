import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { loader } from '../TagListPage/route';
import { TagRemovePage } from './TagRemovePage';
import type { Tag } from '../../../model/tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const { mockList, mockRemove } = vi.hoisted(() => ({ mockList: vi.fn(), mockRemove: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, create: vi.fn(), update: vi.fn(), remove: mockRemove },
}));

const TAG: Tag = { id: 'tag-1', name: 'Sazonal', color: '#0ea5e9', description: null };

function buildRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: '/tags',
        id: 'tags-list',
        Component: () => <Outlet />,
        loader,
        children: [{ path: ':id/remove', Component: TagRemovePage }],
      },
    ],
    { initialEntries: [initialEntry] },
  );
}

function renderPage(id = TAG.id) {
  const router = buildRouter(`/tags/${id}/remove`);
  render(<RouterProvider router={router} />);
  return router;
}

describe('TagRemovePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: [TAG] });
  });

  it('does not submit anything until the person confirms (spec US4)', async () => {
    renderPage();

    expect(await screen.findByText(/Tem certeza que deseja excluir/)).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('removes an unused tag, shows a success toast, navigates back, and revalidates the list (spec US4)', async () => {
    const user = userEvent.setup();
    mockRemove.mockResolvedValue({ ok: true, data: undefined });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const router = renderPage();
    await screen.findByText(/Tem certeza que deseja excluir/);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Excluído com sucesso',
        description: '"Sazonal" foi removida do catálogo.',
        type: 'success',
      }),
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('shows the exact service count and blocks the delete when the tag is in use (spec FR-008)', async () => {
    const user = userEvent.setup();
    const blocked: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: 'Esta etiqueta está em uso por 3 serviço(s) e não pode ser excluída.',
      status: 409,
      code: 'Tag.InUse',
      errors: {
        '': [
          {
            code: 'Tag.InUse',
            message: 'Esta etiqueta está em uso por 3 serviço(s) e não pode ser excluída.',
          },
        ],
      },
    };
    mockRemove.mockResolvedValue({ ok: false, error: blocked });
    const router = renderPage();
    await screen.findByText(/Tem certeza que deseja excluir/);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText(
        'Esta etiqueta está em uso por 3 serviço(s) e não pode ser excluída.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Não é possível excluir' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/tags/${TAG.id}/remove`);

    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
  });

  it('shows the not-found message when the tag was already removed by someone else during confirm (edge case, spec FR-012)', async () => {
    const user = userEvent.setup();
    const notFound: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Etiqueta 'tag-1' não foi encontrada.",
      status: 404,
      code: 'Tag.NotFound',
      errors: { '': [{ code: 'Tag.NotFound', message: "Etiqueta 'tag-1' não foi encontrada." }] },
    };
    mockRemove.mockResolvedValue({ ok: false, error: notFound });
    renderPage();
    await screen.findByText(/Tem certeza que deseja excluir/);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText("Etiqueta 'tag-1' não foi encontrada.")).toBeInTheDocument();
  });

  it('offers a retry, not a dismiss-only block, when the failure is transient (T029)', async () => {
    const user = userEvent.setup();
    const networkProblem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };
    mockRemove.mockResolvedValue({ ok: false, error: networkProblem });
    const router = renderPage();
    await screen.findByText(/Tem certeza que deseja excluir/);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Sem conexão com o servidor. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmar exclusão?' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Não é possível excluir' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/tags/${TAG.id}/remove`);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mockRemove).toHaveBeenCalledTimes(2);
  });

  it('shows the not-found dialog, not a crash, when the id is not in the loaded list', async () => {
    const router = renderPage('missing-id');

    expect(
      await screen.findByRole('heading', { name: 'Etiqueta não encontrada' }),
    ).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar para a lista' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tags'));
  });
});
