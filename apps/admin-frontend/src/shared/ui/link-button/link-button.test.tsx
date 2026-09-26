import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlusIcon } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { LinkButton } from './index';

function registerNewTagShortcut() {
  shortcutRegistry.register({
    id: 'nova-etiqueta',
    key: 'n',
    description: 'Nova etiqueta',
    handler: vi.fn(),
  });
}

function markKeyboardPresent() {
  fireEvent.keyDown(document, { key: 'Tab' });
}

describe('LinkButton', () => {
  beforeEach(() => {
    shortcutRegistry.reset();
  });

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

  it('advertises nothing for a shortcut id nobody registered', () => {
    markKeyboardPresent();
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" shortcutId="nova-etiqueta">
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).not.toHaveAttribute(
      'aria-keyshortcuts',
    );
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('carries a registered shortcut as aria-keyshortcuts even before any keyboard is seen, but no keycap', () => {
    registerNewTagShortcut();
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" shortcutId="nova-etiqueta">
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).toHaveAttribute(
      'aria-keyshortcuts',
      'n',
    );
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('renders the keycap once a keyboard is present, without changing the accessible name (regression: a keycap must stay aria-hidden)', () => {
    registerNewTagShortcut();
    markKeyboardPresent();
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new" shortcutId="nova-etiqueta">
          Nova etiqueta
        </LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova etiqueta' })).toBeInTheDocument();
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
