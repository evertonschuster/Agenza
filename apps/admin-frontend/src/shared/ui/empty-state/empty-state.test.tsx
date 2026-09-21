import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagIcon } from 'lucide-react';
import { EmptyState } from './index';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState title="Nenhuma etiqueta cadastrada" description="Crie a primeira etiqueta." />,
    );

    expect(screen.getByText('Nenhuma etiqueta cadastrada')).toBeInTheDocument();
    expect(screen.getByText('Crie a primeira etiqueta.')).toBeInTheDocument();
  });

  it('renders the supplied action', () => {
    render(
      <EmptyState
        title="Nenhuma etiqueta cadastrada"
        action={<button type="button">Nova etiqueta</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nova etiqueta' })).toBeInTheDocument();
  });

  it('renders no action when omitted', () => {
    render(<EmptyState title="Nenhuma etiqueta cadastrada" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the icon, hidden from assistive tech, only when supplied', () => {
    const { container } = render(<EmptyState title="Nenhuma etiqueta cadastrada" icon={TagIcon} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no icon wrapper when omitted', () => {
    const { container } = render(<EmptyState title="Nenhuma etiqueta cadastrada" />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
