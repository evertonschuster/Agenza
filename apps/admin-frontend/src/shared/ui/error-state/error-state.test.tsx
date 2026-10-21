import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './index';

describe('ErrorState', () => {
  it('renders with role="alert"', () => {
    render(<ErrorState title="Não foi possível carregar" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the title, description and code', () => {
    render(
      <ErrorState
        title="Não foi possível carregar"
        description="Sem conexão."
        code="Network.Unreachable"
      />,
    );

    expect(screen.getByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.getByText('Sem conexão.')).toBeInTheDocument();
    expect(screen.getByText('Código: Network.Unreachable')).toBeInTheDocument();
  });

  it('renders a default-labeled retry button that calls onRetry on click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Não foi possível carregar" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('honors a custom retry label', () => {
    render(
      <ErrorState title="Não foi possível carregar" retryLabel="Recarregar" onRetry={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
  });

  it('renders no retry button when onRetry is omitted', () => {
    render(<ErrorState title="Não foi possível carregar" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
