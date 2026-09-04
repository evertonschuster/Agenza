import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the title', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
  });
});
