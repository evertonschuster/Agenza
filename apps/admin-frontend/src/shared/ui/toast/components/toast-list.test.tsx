import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Toaster, toast } from '..';

describe('ToastList', () => {
  let toastId: string | undefined;

  afterEach(() => {
    act(() => toast.close(toastId));
  });

  function show(data?: { code: string }) {
    render(<Toaster />);
    act(() => {
      toastId = toast.add({
        title: 'Não foi possível abrir a etiqueta',
        description: 'Muitas solicitações em pouco tempo.',
        ...(data && { data }),
        type: 'info',
        timeout: 0,
      });
    });
  }

  it('shows the problem code under the description, in a smaller size than it', async () => {
    show({ code: 'RateLimit.Exceeded' });

    const code = await screen.findByText('Código: RateLimit.Exceeded');
    expect(code).toHaveClass('text-xs');
    expect(screen.getByText('Muitas solicitações em pouco tempo.')).toHaveClass('text-sm');
  });

  it('shows no code line when the toast carries no code', async () => {
    show();

    expect(await screen.findByText('Muitas solicitações em pouco tempo.')).toBeInTheDocument();
    expect(screen.queryByText(/Código:/)).not.toBeInTheDocument();
  });
});
