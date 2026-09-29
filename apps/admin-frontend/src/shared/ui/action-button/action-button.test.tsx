import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlusIcon } from 'lucide-react';
import { ActionButton } from './index';

describe('ActionButton', () => {
  it('is named by its children, with the icon hidden from assistive technology', () => {
    render(<ActionButton icon={PlusIcon}>Novo serviço</ActionButton>);

    const button = screen.getByRole('button', { name: 'Novo serviço' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards clicks and the underlying Button props', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionButton variant="outline" onClick={onClick}>
        Buscar
      </ActionButton>,
    );

    const button = screen.getByRole('button', { name: 'Buscar' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute('data-variant', 'outline');
  });

  it('shows a spinner instead of the icon and blocks clicks while pending', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionButton icon={PlusIcon} pending onClick={onClick}>
        Salvando…
      </ActionButton>,
    );

    const button = screen.getByRole('button', { name: 'Salvando…' });
    await user.click(button);
    await user.keyboard('{Enter}');

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
    expect(button.querySelectorAll('svg')).toHaveLength(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps a pending button focusable, so the person who pressed it keeps their place while it runs', () => {
    const { rerender } = render(<ActionButton>Excluir</ActionButton>);
    const button = screen.getByRole('button', { name: 'Excluir' });
    button.focus();

    rerender(<ActionButton pending>Excluir</ActionButton>);

    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveFocus();
  });

  it('stays disabled when asked to, even while not pending', () => {
    render(<ActionButton disabled>Salvar</ActionButton>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});
