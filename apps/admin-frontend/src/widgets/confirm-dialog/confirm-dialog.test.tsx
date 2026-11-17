import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchiveIcon } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { ConfirmDialog } from '.';
import { RATE_LIMIT_PROBLEM, type ApiResult } from '@/shared/api/servicesFacade';
import { logger } from '@/shared/logger';
import { createTopic } from '@/shared/pubsub/createTopic';
import { toast } from '@/shared/ui/toast';

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
  it('keeps an unexpected outcome uncertain and allows closing without retrying', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new Error('unexpected'));
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    const title = await screen.findByRole('heading', {
      name: 'Não foi possível confirmar o resultado',
    });
    expect(title).toHaveFocus();
    expect(
      screen.getByText('Verifique se a ação foi concluída antes de tentar novamente.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith('confirm_dialog.outcome_unknown');
    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not present a failed post-success notification as a failed operation', async () => {
    const user = userEvent.setup();
    const topic = createTopic<void>();
    const unsubscribe = topic.subscribe(() => {
      throw new Error('listener failed');
    });
    const mutation = vi
      .fn<() => Promise<ApiResult<void>>>()
      .mockResolvedValue({ ok: true, data: undefined });
    const onConfirm = vi.fn(async () => {
      const result = await mutation();
      topic.publish();
      return result;
    });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(
      await screen.findByRole('heading', { name: 'Não foi possível confirmar o resultado' }),
    ).toBeInTheDocument();
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    unsubscribe();
  });

  it('prevents synchronous reentry while a confirmation is pending', async () => {
    let resolveConfirm: (result: ApiResult<void>) => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<ApiResult<void>>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    const button = screen.getByRole('button', { name: 'Desativar' });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveConfirm({ ok: true, data: undefined });
      await Promise.resolve();
    });
  });

  it('keeps global success but skips local callbacks after unmount', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const toastSpy = vi.spyOn(toast, 'add');
    let resolveConfirm: (result: ApiResult<void>) => void = () => {};
    const onConfirm = () =>
      new Promise<ApiResult<void>>((resolve) => {
        resolveConfirm = resolve;
      });
    const view = render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    view.unmount();
    await act(async () => {
      resolveConfirm({ ok: true, data: undefined });
      await Promise.resolve();
    });
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    toastSpy.mockRestore();
  });

  it('notifies an uncertain result after the dialog unmounts', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'add');
    const onOpenChange = vi.fn();
    let rejectConfirm: (error: Error) => void = () => {};
    const onConfirm = () =>
      new Promise<ApiResult<void>>((_, reject) => {
        rejectConfirm = reject;
      });
    const view = render(
      <ConfirmDialog {...BASE_PROPS} onOpenChange={onOpenChange} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    view.unmount();
    await act(async () => {
      rejectConfirm(new Error('unexpected'));
      await Promise.resolve();
    });
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Não foi possível confirmar o resultado',
        description: 'Verifique se a ação foi concluída antes de tentar novamente.',
        type: 'error',
      }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    toastSpy.mockRestore();
  });

  it('reports a local callback failure without misreporting the completed operation', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'add');
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn(() => {
      throw new Error('view update failed');
    });
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={onOpenChange}
        onConfirm={() => Promise.resolve({ ok: true, data: undefined })}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(logger.error).toHaveBeenCalledWith('confirm_dialog.success_callback_failed');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ação concluída',
        description: 'Não foi possível atualizar a tela. Atualize a página.',
        type: 'error',
      }),
    );
    toastSpy.mockRestore();
  });

  it('still runs the local callback and closes when the success toast throws', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'add').mockImplementationOnce(() => {
      throw new Error('toast failed');
    });
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={onOpenChange}
        onConfirm={() => Promise.resolve({ ok: true, data: undefined })}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith('confirm_dialog.success_notification_failed');
    toastSpy.mockRestore();
  });

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

  it('confirms by click without a Ctrl+Delete binding', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.keyboard('{Control>}{Delete}{/Control}');
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
    expect(screen.getByRole('button', { name: 'Desativar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    resolveConfirm({ ok: true, data: undefined });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desativar' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
  });

  describe('while what it confirms is still loading', () => {
    it('announces the load in place of the description and keeps confirm disabled', () => {
      render(<ConfirmDialog {...BASE_PROPS} loading onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

      expect(screen.getByRole('heading', { name: 'Desativar promoção?' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
      expect(screen.queryByText(/desativar a promoção "Verão"/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Desativar' })).toBeDisabled();
    });

    it('still lets the person leave with Cancelar', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <ConfirmDialog {...BASE_PROPS} loading onOpenChange={onOpenChange} onConfirm={vi.fn()} />,
      );

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('offers no way out while a confirm is in flight — Cancelar disabled, ✕ hidden, Esc ignored — since the action finishes anyway', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    let resolveConfirm: (result: ApiResult<void>) => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<ApiResult<void>>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();

    resolveConfirm({ ok: true, data: undefined });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });

  it('fires a success toast built from the success copy when confirm succeeds', async () => {
    const user = userEvent.setup();
    const toastModule = await import('@/shared/ui/toast');
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
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sem conexão com o servidor. Tente novamente.');
    expect(alert).toHaveTextContent('Código: Network.Unreachable');
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('offers a retry, not a permanent block, when the failure is a rate limit', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({ ok: false, error: RATE_LIMIT_PROBLEM });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(RATE_LIMIT_PROBLEM.title ?? '');
    expect(alert).toHaveTextContent('Código: RateLimit.Exceeded');
    expect(
      screen.queryByRole('heading', { name: 'Não é possível desativar' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entendi' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('clears the previous failure while retrying, so a repeated failure is announced again', async () => {
    const user = userEvent.setup();
    const failure: ApiResult<void> = {
      ok: false,
      error: {
        status: 0,
        code: 'Network.Unreachable',
        title: 'Sem conexão com o servidor. Tente novamente.',
      },
    };
    let resolveRetry: (result: ApiResult<void>) => void = () => {};
    const onConfirm = vi
      .fn<() => Promise<ApiResult<void>>>()
      .mockResolvedValueOnce(failure)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          }),
      );
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    resolveRetry(failure);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sem conexão com o servidor. Tente novamente.',
    );
  });

  it('offers an explicit retry for a non-transient failure without related records', async () => {
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
    expect(screen.getByText('Código: Promotion.InUse')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Desativar promoção?' })).not.toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entendi' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('automatically displays related records and a retry for a different blocked error', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Promotion.InUse',
        title: 'Há registros vinculados.',
        errors: {
          Clients: [{ code: 'Promotion.InUse', meta: { id: 'a/1', name: 'Ana Lima' } }],
          Services: [{ code: 'Promotion.InUse', meta: { name: 'Massagem' } }],
          Procedures: [{ code: 'Promotion.InUse', meta: { name: 'Consulta' } }],
        },
      },
    });
    render(
      <MemoryRouter>
        <ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByText('Há registros vinculados.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Ana Lima.*outra aba/ });
    expect(link).toHaveAttribute('href', '/pessoas/a%2F1/editar');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      within(screen.getByRole('region', { name: 'Serviços' })).getByText('Massagem'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Outros vínculos' })).getByText('Consulta'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Não é possível desativar' })).toHaveFocus();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('announces a repeated block even if its title is unchanged', async () => {
    const user = userEvent.setup();
    const onConfirm = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'Tag.InUse',
          title: 'Em uso.',
          errors: { Clients: [{ code: 'Tag.InUse', meta: { name: 'Ana' } }] },
        },
      })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'Tag.InUse',
          title: 'Em uso.',
          errors: { Clients: [{ code: 'Tag.InUse', meta: { name: 'Bia' } }] },
        },
      });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tentativa 1 concluída. Confira as informações atualizadas.',
    );
  });

  it('moves focus to a transient failure after a blocked retry', async () => {
    const user = userEvent.setup();
    const onConfirm = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: { code: 'Tag.InUse', title: 'Em uso.' } })
      .mockResolvedValueOnce({ ok: false, error: { status: 503, title: 'Indisponível.' } });
    render(<ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Indisponível.');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('supports a custom retry label and preserves the confirmation variant', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: { status: 409, code: 'Promotion.InUse', title: 'Não é possível desativar.' },
    });
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        confirmation={{ ...BASE_PROPS.confirmation, confirmVariant: 'default' }}
        error={{ blockedRetryLabel: 'Tentar desativar novamente' }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    const retry = await screen.findByRole('button', { name: 'Tentar desativar novamente' });
    expect(retry).toHaveAttribute('data-variant', 'default');
    await user.click(retry);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('keeps an accessible retry button if the custom label is blank', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: { status: 409, code: 'Promotion.InUse', title: 'Bloqueada.' },
    });
    render(
      <ConfirmDialog
        {...BASE_PROPS}
        error={{ blockedRetryLabel: '   ' }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('shows related records on transient errors and retains the existing retry action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        status: 503,
        code: 'Server.Unavailable',
        title: 'Serviço indisponível.',
        errors: { Clients: [{ code: 'Server.Unavailable', meta: { id: '123', name: 'Ana' } }] },
      },
    });
    render(
      <MemoryRouter>
        <ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={onConfirm} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível.');
    expect(screen.getByRole('link', { name: /Ana.*outra aba/ })).toHaveAttribute(
      'href',
      '/pessoas/123/editar',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
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

  it('marks the confirm button as destructive unless a routine asks for a plain one', () => {
    const first = render(
      <ConfirmDialog {...BASE_PROPS} onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Desativar' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
    first.unmount();

    render(
      <ConfirmDialog
        {...BASE_PROPS}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        confirmation={{ ...BASE_PROPS.confirmation, confirmVariant: 'default' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Desativar' })).toHaveAttribute(
      'data-variant',
      'default',
    );
  });
});
