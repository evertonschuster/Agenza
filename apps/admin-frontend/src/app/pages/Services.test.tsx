import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from '@/shared/ui/toast';
import { Services } from './Services';

describe('Services', () => {
  it('renders the title and the primary action', () => {
    render(<Services />);

    expect(screen.getByRole('heading', { name: 'Serviços' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo serviço' })).toBeInTheDocument();
  });

  it('explains that service creation is unavailable when Novo serviço is clicked', () => {
    const toastAddSpy = vi.spyOn(toast, 'add');
    render(<Services />);

    fireEvent.click(screen.getByRole('button', { name: 'Novo serviço' }));

    expect(toastAddSpy).toHaveBeenCalledWith({
      title: 'Em breve',
      description: 'A criação de serviços ainda não está disponível.',
    });
    toastAddSpy.mockRestore();
  });
});
