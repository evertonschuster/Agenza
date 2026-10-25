import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import {
  DialogFormFooter,
  PageFormFooter,
  type DialogFormFooterProps,
  type PageFormFooterProps,
} from './index';

function renderOnPage(props: Omit<PageFormFooterProps, 'onCancel'>) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const onCancel = vi.fn();
  render(
    <form onSubmit={onSubmit}>
      <PageFormFooter {...props} onCancel={onCancel} />
    </form>,
  );
  return { onSubmit, onCancel };
}

function renderInDialog(props: DialogFormFooterProps, onOpenChange = vi.fn()) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Título</DialogTitle>
        <DialogDescription>Descrição</DialogDescription>
        <form onSubmit={onSubmit}>
          <DialogFormFooter {...props} />
        </form>
      </DialogContent>
    </Dialog>,
  );
  return { onSubmit, onOpenChange };
}

describe('form footers', () => {
  describe('PageFormFooter', () => {
    it('calls onCancel from Cancelar, without submitting the form', async () => {
      const user = userEvent.setup();
      const { onSubmit, onCancel } = renderOnPage({ isSaving: false });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits the form from Salvar', async () => {
      const user = userEvent.setup();
      const { onSubmit, onCancel } = renderOnPage({ isSaving: false });

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('disables Cancelar and shows Salvando… while saving', () => {
      renderOnPage({ isSaving: true });

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Salvando…' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('keeps Salvar enabled unless canSubmit says otherwise', () => {
      renderOnPage({ isSaving: false });

      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    });

    it('disables Salvar when canSubmit is false', () => {
      renderOnPage({ isSaving: false, canSubmit: false });

      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    });
  });

  describe('DialogFormFooter', () => {
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
