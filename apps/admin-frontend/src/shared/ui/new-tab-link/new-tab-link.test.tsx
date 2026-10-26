import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NewTabLink } from './index';

describe('NewTabLink', () => {
  it('opens the supplied destination in a new tab and keeps the supplied label', () => {
    render(
      <MemoryRouter>
        <NewTabLink to="/servicos/123">Ver serviço</NewTabLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Ver serviço' });
    expect(link).toHaveAttribute('href', '/servicos/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
