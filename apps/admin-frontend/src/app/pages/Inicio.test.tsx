import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inicio } from './Inicio';

describe('Inicio', () => {
  it('renders the title', () => {
    render(<Inicio />);

    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
  });
});
