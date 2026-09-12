import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { ShortcutHelpSheet } from './ShortcutHelpSheet';

describe('ShortcutHelpSheet', () => {
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('opens on "?" showing its title', () => {
    render(<ShortcutHelpSheet />);

    fireEvent.keyDown(document, { key: '?' });

    expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });
});
