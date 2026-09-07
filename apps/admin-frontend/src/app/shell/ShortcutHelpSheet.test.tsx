import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { expectNoA11yViolations } from '@/test/a11y';
import { ShortcutHelpSheet } from './ShortcutHelpSheet';

describe('ShortcutHelpSheet', () => {
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('opens on "?" showing its title and the disable-shortcuts preference', () => {
    render(<ShortcutHelpSheet />);

    fireEvent.keyDown(document, { key: '?' });

    expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /caractere único/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('has no a11y violations while open', async () => {
    const { baseElement } = render(<ShortcutHelpSheet />);

    fireEvent.keyDown(document, { key: '?' });

    await expectNoA11yViolations(baseElement);
  });

  it('exposes each keycap to the accessibility tree instead of hiding it', () => {
    const { baseElement } = render(<ShortcutHelpSheet />);

    fireEvent.keyDown(document, { key: '?' });

    const keycaps = baseElement.querySelectorAll('[data-slot="kbd"]');
    expect(keycaps.length).toBeGreaterThan(0);
    keycaps.forEach((keycap) => {
      expect(keycap).not.toHaveAttribute('aria-hidden', 'true');
    });
  });
});
