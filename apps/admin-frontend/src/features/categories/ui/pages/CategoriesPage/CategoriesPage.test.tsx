import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ok, fail } from '@/shared/result';
import { SESSION_PROBLEM, type ApiResult } from '@/shared/api/servicesFacade';
import type { Category } from '../../../model/category';
import { CategoriesPage } from './CategoriesPage';
import { CategoriesPending } from './CategoriesPending';
import { CategoriesRouteError } from './CategoriesRouteError';
import { categoriesAction, categoriesLoader } from './route';

const { listMock, createMock, updateMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../../../api/categoryRepository', () => ({
  categoryRepository: { list: listMock, create: createMock, update: updateMock },
}));

const CABELO: Category = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };
const BARBA: Category = { id: '22222222-2222-2222-2222-222222222222', name: 'Barba' };

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/categories',
        loader: categoriesLoader,
        action: categoriesAction,
        element: <CategoriesPage />,
        errorElement: <CategoriesRouteError />,
        HydrateFallback: CategoriesPending,
      },
    ],
    { initialEntries: ['/categories'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue(ok([CABELO]));
    createMock.mockReset().mockResolvedValue(ok(CABELO));
    updateMock.mockReset().mockResolvedValue(ok(CABELO));
  });

  it('shows the loading state, then the list once list() resolves', async () => {
    listMock.mockResolvedValue(ok([CABELO, BARBA]));

    renderPage();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();

    expect(await screen.findByText('Cabelo')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('shows the failure title and code when list() fails, through the route error element', async () => {
    listMock.mockResolvedValue(
      fail({ title: 'O servidor está instável.', status: 0, code: 'Server.Unavailable' }),
    );

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O servidor está instável.');
    expect(alert).toHaveTextContent('(Server.Unavailable)');
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('falls back to generic copy when the Problem body has no title or code', async () => {
    listMock.mockResolvedValue(fail({ status: 0 }));

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Algo deu errado.');
    expect(alert).not.toHaveTextContent('(');
  });

  it('ignores a second submit while a create is already in flight', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (result: ApiResult<Category>) => void;
    createMock.mockReturnValue(
      new Promise<ApiResult<Category>>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const { container } = renderPage();
    await screen.findByText('Cabelo');
    const form = container.querySelector('form');
    if (!form) throw new Error('expected a <form> to submit');

    await user.type(screen.getByLabelText('Nova categoria'), 'Maquiagem');
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith('Maquiagem');

    resolveCreate(
      fail({ title: 'Esse nome já existe.', status: 409, code: 'Category.DuplicateName' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse nome já existe.');
  });

  it('saves an inline edit with the trimmed name and reloads the list', async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Editar' }));

    const input = screen.getByLabelText('Nome da categoria');
    await user.clear(input);
    await user.type(input, '  Barba  ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(CABELO.id, 'Barba'));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('drops an inline edit on Cancelar and goes back to the read view', async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Editar' }));

    await user.type(screen.getByLabelText('Nome da categoria'), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Nome da categoria')).not.toBeInTheDocument();
    expect(screen.getByText('Cabelo')).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('clears the field and reloads after a successful create', async () => {
    const user = userEvent.setup();
    const maquiagem: Category = { id: '33333333-3333-3333-3333-333333333333', name: 'Maquiagem' };
    listMock.mockResolvedValueOnce(ok([]));
    listMock.mockResolvedValue(ok([maquiagem]));
    createMock.mockResolvedValue(ok(maquiagem));

    renderPage();
    await waitFor(() => expect(screen.queryByText('Carregando…')).not.toBeInTheDocument());

    await user.type(screen.getByLabelText('Nova categoria'), 'Maquiagem');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(screen.getByLabelText('Nova categoria')).toHaveValue(''));
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Maquiagem')).toBeInTheDocument();
  });

  it('renders a validation error from the action in the form, without hitting the route error element', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue(
      fail({
        title: 'Nome é obrigatório.',
        status: 400,
        code: 'Category.NameRequired',
        errors: { name: [{ code: 'Category.NameRequired', message: 'Nome é obrigatório.' }] },
      }),
    );

    renderPage();
    await screen.findByText('Cabelo');

    await user.type(screen.getByLabelText('Nova categoria'), 'Cabelo');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Nome é obrigatório.');
    expect(alert).toHaveTextContent('Category.NameRequired');
    expect(screen.getByText('Cabelo')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova categoria')).toBeInTheDocument();
  });

  it('sends a loader failure (an expired session) to the route error element', async () => {
    listMock.mockResolvedValue(fail(SESSION_PROBLEM));

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sua sessão expirou. Entre novamente.');
    expect(alert).toHaveTextContent('(Session.Missing)');
    expect(screen.queryByLabelText('Nova categoria')).not.toBeInTheDocument();
  });
});
