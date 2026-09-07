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

    expect(screen.getByRole('menuitemradio', { name: /Claro/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Escuro/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Automático/ })).toBeInTheDocument();
  });

  it('applies the chosen theme through the shared theme store', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Escuro/ }));

    expect(themeStore.getSnapshot()).toEqual({ choice: 'dark', resolved: 'dark' });
  });

  it('exposes the selected theme via aria-checked, not just a decorative icon', () => {
    themeStore.setChoice('light');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));

    expect(screen.getByRole('menuitemradio', { name: /Claro/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: /Escuro/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});
