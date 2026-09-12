import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('renders the destination title, its specific description, an "Em breve" tag and a way back', () => {
    render(
      <MemoryRouter>
        <ComingSoon icon={CalendarDays} title="Agenda" description="Texto de teste específico." />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText('Texto de teste específico.')).toBeInTheDocument();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
  });
});
