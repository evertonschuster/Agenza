import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { themeStore } from '@/shared/theme/themeStore';
import { ThemeToggle } from './ThemeToggle';

// Base UI's Menu trigger doesn't open under userEvent.click() in jsdom (its pointerdown/click
// sequencing needs real browser timing) — fireEvent.click matches how the other shared/ui overlay
// tests already avoid the same jsdom gap.
describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    themeStore.reset();
  });

  it('offers the three theme states, not a binary switch', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));

    expect(screen.getByRole('menuitem', { name: /Claro/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Escuro/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Automático/ })).toBeInTheDocument();
  });

  it('applies the chosen theme through the shared theme store', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Escuro/ }));

    expect(themeStore.getSnapshot()).toEqual({ choice: 'dark', resolved: 'dark' });
  });
});
