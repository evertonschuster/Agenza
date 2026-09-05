import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Servicos } from './Servicos';

describe('Servicos', () => {
  it('renders the title', () => {
    render(<Servicos />);

    expect(screen.getByRole('heading', { name: 'Serviços' })).toBeInTheDocument();
  });
});
