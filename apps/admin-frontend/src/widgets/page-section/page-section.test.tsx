import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PageSection } from './index';

describe('PageSection', () => {
  it('names the region after its title and shows the description under it', () => {
    render(
      <PageSection title="Responsáveis" description="Quem responde pela pessoa.">
        <p>conteúdo</p>
      </PageSection>,
    );

    const region = screen.getByRole('region', { name: 'Responsáveis' });
    expect(within(region).getByRole('heading', { name: 'Responsáveis', level: 2 })).toBeVisible();
    expect(within(region).getByText('Quem responde pela pessoa.')).toBeInTheDocument();
    expect(within(region).getByText('conteúdo')).toBeInTheDocument();
  });

  it('renders the action next to the title', () => {
    render(
      <PageSection
        title="Responsáveis"
        description="Quem responde pela pessoa."
        action={<button>Adicionar</button>}
      >
        <p>conteúdo</p>
      </PageSection>,
    );

    const region = screen.getByRole('region', { name: 'Responsáveis' });
    expect(within(region).getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('works with a title alone', () => {
    render(
      <PageSection title="Endereço">
        <p>conteúdo</p>
      </PageSection>,
    );

    const region = screen.getByRole('region', { name: 'Endereço' });
    expect(region.querySelector('p.text-muted-foreground')).toBeNull();
  });

  it('keeps the title for assistive tech only when hideTitle is set', () => {
    render(
      <PageSection title="Dados da pessoa" hideTitle>
        <p>conteúdo</p>
      </PageSection>,
    );

    const region = screen.getByRole('region', { name: 'Dados da pessoa' });
    expect(within(region).getByRole('heading', { name: 'Dados da pessoa' })).toHaveClass('sr-only');
  });

  it('gives each section its own heading id so several can share a page', () => {
    render(
      <>
        <PageSection title="Um">
          <p>a</p>
        </PageSection>
        <PageSection title="Dois">
          <p>b</p>
        </PageSection>
      </>,
    );

    expect(screen.getByRole('region', { name: 'Um' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Dois' })).toBeInTheDocument();
  });
});
