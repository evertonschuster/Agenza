import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, type ActionFunction } from 'react-router';
import { DeleteTagDialog } from './DeleteTagDialog';
import { toast } from '@/shared/ui/toast';
import type { Tag } from '../../../model/tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const TAG: Tag = { id: 'tag-1', name: 'Sazonal', color: '#0ea5e9', description: null };

function renderDialog(action: ActionFunction) {
  const onOpenChange = vi.fn();
  const Stub = createRoutesStub([
    {
      path: '/tags',
      Component: () => <DeleteTagDialog tag={TAG} onOpenChange={onOpenChange} />,
      action,
    },
  ]);
  render(<Stub initialEntries={['/tags']} />);
  return { onOpenChange };
}

describe('DeleteTagDialog', () => {
  it('does not submit anything until the person confirms (spec US4)', () => {
    const action = vi.fn();
    renderDialog(action);

    expect(screen.getByText(/Tem certeza que deseja excluir/)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('removes an unused tag, shows a success toast, and closes on confirm (spec US4)', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const { onOpenChange } = renderDialog(action);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
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
    const action = vi.fn().mockResolvedValue({ ok: false, error: blocked });
    const { onOpenChange } = renderDialog(action);

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
    const action = vi.fn().mockResolvedValue({ ok: false, error: notFound });
    renderDialog(action);

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
    const action = vi.fn().mockResolvedValue({ ok: false, error: networkProblem });
    const { onOpenChange } = renderDialog(action);

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
    expect(action).toHaveBeenCalledTimes(2);
  });
});
