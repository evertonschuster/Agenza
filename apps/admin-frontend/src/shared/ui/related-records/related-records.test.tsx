import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RelatedRecords } from './index';

describe('RelatedRecords', () => {
  it('renders accessible groups, optional descriptions and configured links', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelatedRecords
          notices={['A lista pode estar incompleta.']}
          groups={[
            {
              key: 'people',
              title: 'Pessoas',
              items: [{ id: '123', name: 'Ana Lima' }, { name: 'Sem identificador' }],
              getEditPath: (record) => (record.id ? `/pessoas/${record.id}/editar` : undefined),
            },
            {
              key: 'services',
              title: 'Serviços',
              items: [{ id: '456', name: 'Massagem' }],
              description: 'Gerenciamento indisponível.',
            },
            { key: 'empty', title: 'Sem registros', items: [], description: 'Não exibir.' },
          ]}
        />
      </MemoryRouter>,
    );

    const people = screen.getByRole('region', { name: 'Pessoas' });
    const link = within(people).getByRole('link', { name: /Ana Lima.*outra aba/ });
    expect(link).toHaveAttribute('href', '/pessoas/123/editar');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(people).getByText('Sem identificador').tagName).toBe('LI');
    const services = screen.getByRole('region', { name: 'Serviços' });
    expect(within(services).getByText('Massagem').tagName).toBe('LI');
    expect(within(services).getByText('Gerenciamento indisponível.')).toBeInTheDocument();
    expect(within(services).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sem registros' })).not.toBeInTheDocument();
    expect(screen.queryByText('Não exibir.')).not.toBeInTheDocument();
    expect(screen.getByText('A lista pode estar incompleta.')).toBeInTheDocument();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('keeps headings distinct when multiple instances use the same group title', () => {
    render(
      <MemoryRouter>
        <RelatedRecords groups={[{ key: 'one', title: 'Vínculos', items: [{ name: 'Um' }] }]} />
        <RelatedRecords groups={[{ key: 'two', title: 'Vínculos', items: [{ name: 'Dois' }] }]} />
      </MemoryRouter>,
    );

    const regions = screen.getAllByRole('region', { name: 'Vínculos' });
    expect(regions).toHaveLength(2);
    expect(regions[0]).toHaveAttribute('aria-labelledby');
    expect(regions[0]?.getAttribute('aria-labelledby')).not.toBe(
      regions[1]?.getAttribute('aria-labelledby'),
    );
  });
});
