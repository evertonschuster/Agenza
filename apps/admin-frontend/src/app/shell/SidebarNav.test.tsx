import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SidebarNav } from './SidebarNav';

describe('SidebarNav', () => {
  it('marks the active destination with aria-current="page" (spec FR-009 area)', () => {
    render(
      <MemoryRouter initialEntries={['/servicos']}>
        <SidebarNav compact={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Serviços/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Início/ })).not.toHaveAttribute('aria-current');
  });

  it('keeps every destination reachable and named in full mode, including the coming-soon ones', () => {
    render(
      <MemoryRouter>
        <SidebarNav compact={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Agenda \(em breve\)/ })).toBeInTheDocument();
  });

  it('keeps an accessible name for each link in compact mode, even without a visible label', () => {
    render(
      <MemoryRouter>
        <SidebarNav compact />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Início/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Agenda \(em breve\)/ })).toBeInTheDocument();
  });
});
