import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { Services } from './Services';

describe('Services', () => {
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('renders the title', () => {
    render(<Services />);

    expect(screen.getByRole('heading', { name: 'Serviços' })).toBeInTheDocument();
  });

  it('keeps the primary CTA accessible name equal to its visible label once the shortcut keycap renders', () => {
    render(<Services />);
    // Any keypress marks a keyboard device present, which is what makes the resting "N" keycap
    // render alongside the label — the keycap must stay out of the accessible name regardless.
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    const button = screen.getByRole('button', { name: 'Novo serviço' });
    const keycap = button.querySelector('[data-slot="kbd"]');

    expect(button).toBeInTheDocument();
    expect(keycap).toHaveTextContent('N');
  });
});
