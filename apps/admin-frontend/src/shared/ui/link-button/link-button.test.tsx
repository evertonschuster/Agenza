import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlusIcon } from 'lucide-react';
import { MemoryRouter } from 'react-router';
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

  it('renders no icon when none is given', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/tags/new">Nova etiqueta</LinkButton>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Nova etiqueta' }).querySelector('svg')).toBeNull();
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
