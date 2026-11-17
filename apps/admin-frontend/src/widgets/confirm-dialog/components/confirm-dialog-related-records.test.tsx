import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { ConfirmDialogRelatedRecords } from './confirm-dialog-related-records';

describe('ConfirmDialogRelatedRecords', () => {
  it('renders nothing when no valid records are available', () => {
    const { container } = render(<ConfirmDialogRelatedRecords problem={{}} />);
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
        Services: [{ code: 'Professional.InUse', meta: { id: '456/789', name: 'Massagem' } }],
        Appointments: [{ code: 'Professional.InUse', meta: { name: 'Atendimento' } }],
      },
    } as ApiProblem;
    render(
      <MemoryRouter>
        <ConfirmDialogRelatedRecords problem={problem} />
      </MemoryRouter>,
    );

    const people = screen.getByRole('region', { name: 'Pessoas' });
    const link = within(people).getByRole('link', { name: /Ana Lima.*outra aba/ });
    expect(link).toHaveAttribute('href', '/pessoas/abc%2F123/editar');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(people).getByText('Sem identificador').tagName).toBe('LI');
    const services = screen.getByRole('region', { name: 'Serviços' });
    const serviceLink = within(services).getByRole('link', { name: /Massagem.*outra aba/ });
    expect(serviceLink).toHaveAttribute('href', '/servicos/456%2F789/editar');
    expect(serviceLink).toHaveAttribute('target', '_blank');
    expect(serviceLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      within(services).getByText('O gerenciamento de serviços ainda não está disponível.'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Outros vínculos' })).getByText('Atendimento'),
    ).toBeInTheDocument();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it.each([
    { label: 'ausente', id: undefined },
    { label: 'um ponto', id: '.' },
    { label: 'dois pontos', id: '..' },
    { label: 'Unicode inválido', id: '\ud800' },
  ])('does not create a service link for an ID $label', ({ id }) => {
    const problem = {
      code: 'Tag.InUse',
      errors: { Services: [{ code: 'Tag.InUse', meta: { id, name: 'Massagem' } }] },
    } as ApiProblem;
    render(
      <MemoryRouter>
        <ConfirmDialogRelatedRecords problem={problem} />
      </MemoryRouter>,
    );

    const services = screen.getByRole('region', { name: 'Serviços' });
    expect(within(services).getByText('Massagem').tagName).toBe('LI');
    expect(within(services).queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps headings distinct when multiple instances use the same group title', () => {
    const problem = { errors: { Clients: [{ meta: { name: 'Ana' } }] } } as ApiProblem;
    render(
      <MemoryRouter>
        <ConfirmDialogRelatedRecords problem={problem} />
        <ConfirmDialogRelatedRecords problem={problem} />
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
