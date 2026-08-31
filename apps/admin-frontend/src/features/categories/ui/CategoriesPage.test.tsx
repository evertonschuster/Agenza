import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail } from '@/shared/result';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Category } from '../model/category';
import { CategoriesPage } from './CategoriesPage';

const { listMock, createMock, updateMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../api/categoryRepository', () => ({
  categoryRepository: { list: listMock, create: createMock, update: updateMock },
}));

const CABELO: Category = { id: '11111111-1111-1111-1111-111111111111', name: 'Cabelo' };
const BARBA: Category = { id: '22222222-2222-2222-2222-222222222222', name: 'Barba' };

describe('CategoriesPage', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue(ok([CABELO]));
    createMock.mockReset().mockResolvedValue(ok(CABELO));
    updateMock.mockReset().mockResolvedValue(ok(CABELO));
  });

  it('shows the loading state, then the list once list() resolves', async () => {
    listMock.mockResolvedValue(ok([CABELO, BARBA]));

    render(<CategoriesPage />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();

    expect(await screen.findByText('Cabelo')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('renders an alert instead of the list when list() fails', async () => {
    listMock.mockResolvedValue(
      fail({ title: 'O servidor está instável.', status: 0, code: 'Server.Unavailable' }),
    );

    render(<CategoriesPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O servidor está instável.');
    expect(alert).toHaveTextContent('Server.Unavailable');
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('ignores a second submit while a create is already in flight', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (result: ApiResult<Category>) => void;
    createMock.mockReturnValue(
      new Promise<ApiResult<Category>>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const { container } = render(<CategoriesPage />);
    await screen.findByText('Cabelo');
    const form = container.querySelector('form');
    if (!form) throw new Error('expected a <form> to submit');

    await user.type(screen.getByLabelText('Nova categoria'), 'Maquiagem');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith('Maquiagem');

    resolveCreate(
      fail({ title: 'Esse nome já existe.', status: 409, code: 'Category.DuplicateName' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse nome já existe.');
  });

  it('saves an inline edit with the trimmed name and reloads the list', async () => {
    const user = userEvent.setup();

    render(<CategoriesPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar' }));

    const input = screen.getByLabelText('Nome da categoria');
    await user.clear(input);
    await user.type(input, '  Barba  ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(updateMock).toHaveBeenCalledWith(CABELO.id, 'Barba');
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('drops an inline edit on Cancelar and goes back to the read view', async () => {
    const user = userEvent.setup();

    render(<CategoriesPage />);
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

    render(<CategoriesPage />);
    await waitFor(() => expect(screen.queryByText('Carregando…')).not.toBeInTheDocument());

    const input = screen.getByLabelText('Nova categoria');
    await user.type(input, 'Maquiagem');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(input).toHaveValue(''));
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Maquiagem')).toBeInTheDocument();
  });
});
