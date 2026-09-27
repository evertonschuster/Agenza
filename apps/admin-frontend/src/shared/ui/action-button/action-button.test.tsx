import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlusIcon } from 'lucide-react';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { ActionButton } from './index';

function registerShortcut(id: string, key: string, modified = false) {
  shortcutRegistry.register({ id, key, description: id, handler: vi.fn(), modified });
}

function markKeyboardPresent() {
  fireEvent.keyDown(document, { key: 'Tab' });
}

describe('ActionButton', () => {
  beforeEach(() => {
    shortcutRegistry.reset();
  });

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

  it('advertises nothing for a shortcut id nobody registered, so it can never announce a key that does nothing', () => {
    markKeyboardPresent();
    render(<ActionButton shortcutId="novo-servico">Novo serviço</ActionButton>);

    expect(screen.getByRole('button', { name: 'Novo serviço' })).not.toHaveAttribute(
      'aria-keyshortcuts',
    );
    expect(document.querySelector('[data-slot="kbd"]')).not.toBeInTheDocument();
  });

  it('reads a registered shortcut from the registry: aria-keyshortcuts on the button and a trailing keycap outside its name', () => {
    registerShortcut('salvar', 's', true);
    markKeyboardPresent();
    render(<ActionButton shortcutId="salvar">Salvar</ActionButton>);

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+s');
    expect(button.querySelector('[data-slot="kbd"]')).toHaveTextContent(/S$/);
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

    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
    expect(button.querySelectorAll('svg')).toHaveLength(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays disabled when asked to, even while not pending', () => {
    render(<ActionButton disabled>Salvar</ActionButton>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});
