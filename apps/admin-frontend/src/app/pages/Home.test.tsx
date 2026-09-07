import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from './Home';

describe('Home', () => {
  it('renders the title', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
  });
});
