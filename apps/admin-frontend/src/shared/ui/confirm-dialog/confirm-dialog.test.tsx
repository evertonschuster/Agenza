import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchiveIcon } from 'lucide-react';
import { ConfirmDialog } from '.';
import type { ApiResult } from '@/shared/api/servicesFacade';

const BASE_PROPS = {
  confirmation: {
    title: 'Desativar promoção?',
    description:
      'Tem certeza que deseja desativar a promoção "Verão"? Ela para de aparecer para clientes.',
    icon: ArchiveIcon,
    confirmLabel: 'Desativar',
  },
  error: {
    blockedTitle: 'Não é possível desativar',
  },
} as const;

describe('ConfirmDialog', () => {
  it('renders the configured confirming-state copy, with no transient banner', () => {
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Desativar promoção?' })).toBeInTheDocument();
    expect(screen.getByText(/desativar a promoção "Verão"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/etiqueta/i)).not.toBeInTheDocument();
  });

  it('does not call onConfirm until the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={onOpenChange} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables the confirm button while a confirm is in flight', async () => {
    const user = userEvent.setup();
    let resolveConfirm: (result: ApiResult<void>) => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<ApiResult<void>>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeDisabled();

    resolveConfirm({ ok: true, data: undefined });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desativar' })).not.toBeDisabled(),
    );
  });

  it('fires a success toast built from the success copy when confirm succeeds', async () => {
    const user = userEvent.setup();
    const toastModule = await import('../toast');
    const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
    const onConfirm = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        success={{ title: 'Promoção desativada', description: '"Verão" foi desativada.' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    await waitFor(() =>
      expect(toastAddSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Promoção desativada',
          description: '"Verão" foi desativada.',
          type: 'success',
        }),
      ),
    );
  });

  it('shows the transient-failure banner, relabels confirm to retry, and keeps calling onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        status: 0,
        code: 'Network.Unreachable',
        title: 'Sem conexão com o servidor. Tente novamente.',
      },
    });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(screen.getByRole('heading', { name: 'Desativar promoção?' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sem conexão com o servidor. Tente novamente.',
    );
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('swaps to the blocked state with a single dismiss button and no retry, for a non-transient failure', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        title: 'Esta promoção está em uso e não pode ser desativada.',
        code: 'Promotion.InUse',
      },
    });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(
      await screen.findByRole('heading', { name: 'Não é possível desativar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Esta promoção está em uso e não pode ser desativada.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Desativar promoção?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('lets a second, differently-configured instance use its own copy, with none of the first left behind', () => {
    const first = render(
      <ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Desativar promoção?' })).toBeInTheDocument();
    first.unmount();

    render(
      <ConfirmDialog
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        confirmation={{
          title: 'Remover usuário?',
          description: 'Tem certeza que deseja remover "Ana" do tenant?',
          icon: ArchiveIcon,
          confirmLabel: 'Remover',
        }}
        error={{ blockedTitle: 'Não é possível remover' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Remover usuário?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Desativar promoção?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
  });

  it('uses the pt-BR default auxiliary labels when a routine does not override them', () => {
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('lets a routine override the default auxiliary labels', () => {
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        confirmation={{ ...BASE_PROPS.confirmation, cancelLabel: 'Voltar' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });
});
