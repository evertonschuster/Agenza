import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlusIcon } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import type { ShortcutHint } from '@/shared/keyboard/shortcuts';
import { LinkButton } from './index';

describe('LinkButton', () => {
  it('links to the given destination, with the children as its accessible name', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new">Nova etiqueta</LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).toHaveAttribute(
      'href',
      '/tags/new',
    );
  });

  it('renders no icon and no keycap when neither is given', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new">Nova etiqueta</LinkButton>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Nova etiqueta' });
    expect(link.querySelector('svg')).not.toBeInTheDocument();
    expect(link).not.toHaveAttribute('aria-keyshortcuts');
  });

  it('renders the given icon, hidden from the accessible name', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" icon={PlusIcon}>
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Nova etiqueta' });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no keycap when the hint is not visible', () => {
    const hint: ShortcutHint = { displayKey: 'N', visible: false, ariaKeyshortcuts: 'n' };
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" hint={hint}>
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('renders the keycap when the hint is visible, without changing the accessible name (regression: a keycap must stay aria-hidden)', () => {
    const hint: ShortcutHint = { displayKey: 'N', visible: true, ariaKeyshortcuts: 'n' };
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" hint={hint}>
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).toBeInTheDocument();
  });

  it("carries the hint's aria-keyshortcuts on the link itself, not on the keycap", () => {
    const hint: ShortcutHint = { displayKey: 'N', visible: true, ariaKeyshortcuts: 'n' };
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" hint={hint}>
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).toHaveAttribute(
      'aria-keyshortcuts',
      'n',
    );
  });

  it('applies a non-default variant and an extra className', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" variant="outline" className="w-full">
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Nova etiqueta' });
    expect(link).toHaveAttribute('data-variant', 'outline');
    expect(link).toHaveClass('w-full');
  });
});
