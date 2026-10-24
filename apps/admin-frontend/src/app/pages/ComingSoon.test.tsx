import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { CalendarDays } from 'lucide-react';
import { renderRoutes } from '@/test/renderRoutes';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('renders the title of its route, its specific description, an "Em breve" tag and a way back', () => {
    renderRoutes(
      [
        {
          path: 'agenda',
          handle: { crumb: 'Agenda' },
          element: <ComingSoon icon={CalendarDays} description="Texto de teste específico." />,
        },
      ],
      '/agenda',
    );

    expect(screen.getByRole('heading', { name: 'Agenda', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Texto de teste específico.')).toBeInTheDocument();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
  });
});
