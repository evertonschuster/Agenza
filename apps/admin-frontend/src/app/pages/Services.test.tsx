import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { toast } from '@/shared/ui/toast';
import { renderRoutes } from '@/test/renderRoutes';
import { Services } from './Services';

function renderPage() {
  renderRoutes(
    [{ path: 'servicos', handle: { crumb: 'Serviços' }, element: <Services /> }],
    '/servicos',
  );
}

describe('Services', () => {
  it('renders the title and the primary action', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Serviços' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo serviço' })).toBeInTheDocument();
  });

  it('explains that service creation is unavailable when Novo serviço is clicked', () => {
    const toastAddSpy = vi.spyOn(toast, 'add');
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Novo serviço' }));

    expect(toastAddSpy).toHaveBeenCalledWith({
      title: 'Em breve',
      description: 'A criação de serviços ainda não está disponível.',
    });
    toastAddSpy.mockRestore();
  });
});
