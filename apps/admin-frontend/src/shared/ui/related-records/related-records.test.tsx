import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { RelatedRecords } from './index';

describe('RelatedRecords', () => {
  it('renders nothing when no valid records or notices are available', () => {
    const { container } = render(<RelatedRecords problem={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders groups and their configured behavior directly from a problem', async () => {
    const user = userEvent.setup();
    const problem = {
      code: 'Professional.InUse',
      errors: {
        Clients: [
          { code: 'Professional.InUse', meta: { id: 'abc/123', name: 'Ana Lima' } },
          { meta: { name: 'Sem identificador' } },
        ],
        Services: [{ code: 'Professional.InUse', meta: { id: '456', name: 'Massagem' } }],
        Appointments: [{ code: 'Professional.InUse', meta: { name: 'Atendimento' } }],
      },
    } as ApiProblem;
    render(
      <MemoryRouter>
        <RelatedRecords problem={problem} />
      </MemoryRouter>,
    );

    const people = screen.getByRole('region', { name: 'Pessoas' });
    const link = within(people).getByRole('link', { name: /Ana Lima.*outra aba/ });
    expect(link).toHaveAttribute('href', '/pessoas/abc%2F123/editar');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(people).getByText('Sem identificador').tagName).toBe('LI');
    const services = screen.getByRole('region', { name: 'Serviços' });
    expect(within(services).getByText('Massagem').tagName).toBe('LI');
    expect(
      within(services).getByText('O gerenciamento de serviços ainda não está disponível.'),
    ).toBeInTheDocument();
    expect(within(services).queryByRole('link')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Outros vínculos' })).getByText('Atendimento'),
    ).toBeInTheDocument();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('keeps headings distinct when multiple instances use the same group title', () => {
    const problem = { errors: { Clients: [{ meta: { name: 'Ana' } }] } } as ApiProblem;
    render(
      <MemoryRouter>
        <RelatedRecords problem={problem} />
        <RelatedRecords problem={problem} />
      </MemoryRouter>,
    );
    const regions = screen.getAllByRole('region', { name: 'Pessoas' });
    expect(regions).toHaveLength(2);
    expect(regions[0]).toHaveAttribute('aria-labelledby');
    expect(regions[0]?.getAttribute('aria-labelledby')).not.toBe(
      regions[1]?.getAttribute('aria-labelledby'),
    );
  });
});
