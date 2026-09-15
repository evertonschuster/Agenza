import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteTagDialog } from './DeleteTagDialog';
import { toast } from '@/shared/ui/toast';
import type { Tag } from '../../../model/tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const { mockRemove } = vi.hoisted(() => ({ mockRemove: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { remove: mockRemove, list: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

const TAG: Tag = { id: 'tag-1', name: 'Sazonal', color: '#0ea5e9', description: null };

function renderDialog() {
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();
  render(<DeleteTagDialog tag={TAG} onOpenChange={onOpenChange} onDeleted={onDeleted} />);
  return { onOpenChange, onDeleted };
}

describe('DeleteTagDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not submit anything until the person confirms (spec US4)', () => {
    renderDialog();

    expect(screen.getByText(/Tem certeza que deseja excluir/)).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('removes an unused tag, shows a success toast, and closes on confirm (spec US4)', async () => {
    const user = userEvent.setup();
    mockRemove.mockResolvedValue({ ok: true, data: undefined });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const { onOpenChange, onDeleted } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etiqueta excluída',
        description: '"Sazonal" foi removida do catálogo.',
        type: 'success',
      }),
    );
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
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText(
        'Esta etiqueta está em uso por 3 serviço(s) e não pode ser excluída.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Não é possível excluir' })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the not-found message when the tag was already removed by someone else (edge case, spec FR-012)', async () => {
    const user = userEvent.setup();
    const notFound: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Etiqueta 'tag-1' não foi encontrada.",
      status: 404,
      code: 'Tag.NotFound',
      errors: { '': [{ code: 'Tag.NotFound', message: "Etiqueta 'tag-1' não foi encontrada." }] },
    };
    mockRemove.mockResolvedValue({ ok: false, error: notFound });
    renderDialog();

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
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Sem conexão com o servidor. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Excluir etiqueta?' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Não é possível excluir' }),
    ).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mockRemove).toHaveBeenCalledTimes(2);
  });
});
