import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { FormFooter, type FormFooterProps } from './index';

function renderOnPage(props: FormFooterProps) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <MemoryRouter>
      <form onSubmit={onSubmit}>
        <FormFooter {...props} />
      </form>
    </MemoryRouter>,
  );
  return { onSubmit };
}

function renderInDialog(props: FormFooterProps, onOpenChange = vi.fn()) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Título</DialogTitle>
        <DialogDescription>Descrição</DialogDescription>
        <form onSubmit={onSubmit}>
          <FormFooter {...props} />
        </form>
      </DialogContent>
    </Dialog>,
  );
  return { onSubmit, onOpenChange };
}

describe('FormFooter', () => {
  describe('on a page (cancelTo)', () => {
    it('offers Cancelar as a link to cancelTo and Salvar as the submit button', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderOnPage({ isSaving: false, cancelTo: '/pessoas' });

      expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/pessoas');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('swaps Cancelar for a disabled button and shows Salvando… while saving', () => {
      renderOnPage({ isSaving: true, cancelTo: '/pessoas' });

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.queryByRole('link', { name: 'Cancelar' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvando…' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('keeps Salvar enabled unless canSubmit says otherwise', () => {
      renderOnPage({ isSaving: false, cancelTo: '/pessoas' });

      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    });

    it('disables Salvar when canSubmit is false', () => {
      renderOnPage({ isSaving: false, canSubmit: false, cancelTo: '/pessoas' });

      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    });
  });

  describe('inside a dialog (no cancelTo)', () => {
    it('closes the dialog from Cancelar', async () => {
      const user = userEvent.setup();
      const { onOpenChange } = renderInDialog({ isSaving: false });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });

    it('disables Cancelar and shows Salvando… while saving', () => {
      renderInDialog({ isSaving: true });

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Salvando…' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('disables Salvar when canSubmit is false', () => {
      renderInDialog({ isSaving: false, canSubmit: false });

      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    });

    it('submits the surrounding form from Salvar', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInDialog({ isSaving: false });

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
