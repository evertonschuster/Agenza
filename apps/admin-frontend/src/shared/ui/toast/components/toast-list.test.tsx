import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { Toaster, toast } from '..';

describe('ToastList', () => {
  let toastId: string | undefined;

  afterEach(() => {
    act(() => toast.close(toastId));
  });

  function showServerError(problem: ApiProblem) {
    render(<Toaster />);
    act(() => {
      toastId = toast.serverError('Não foi possível abrir a etiqueta', problem);
    });
  }

  it('shows the problem code under the message, in a smaller size than it', async () => {
    showServerError({
      status: 429,
      code: 'RateLimit.Exceeded',
      title: 'Muitas solicitações em pouco tempo.',
    });

    const code = await screen.findByText('Código: RateLimit.Exceeded');
    expect(code).toHaveClass('text-xs');
    expect(screen.getByText('Muitas solicitações em pouco tempo.')).toHaveClass('text-sm');
  });

  it('shows no code line when the problem has no code', async () => {
    showServerError({ status: 400, title: 'Muitas solicitações em pouco tempo.' });

    expect(await screen.findByText('Muitas solicitações em pouco tempo.')).toBeInTheDocument();
    expect(screen.queryByText(/Código:/)).not.toBeInTheDocument();
  });

  it('shows no code line on a toast that is not about a problem', async () => {
    render(<Toaster />);
    act(() => {
      toastId = toast.add({
        title: 'Etiqueta criada',
        description: '"VIP" foi criada.',
        type: 'success',
      });
    });

    expect(await screen.findByText('"VIP" foi criada.')).toBeInTheDocument();
    expect(screen.queryByText(/Código:/)).not.toBeInTheDocument();
  });
});
