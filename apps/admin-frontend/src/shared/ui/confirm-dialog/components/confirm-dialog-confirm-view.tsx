import { AlertCircleIcon } from 'lucide-react';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import type { ConfirmDialogConfirmViewProps } from '../confirm-dialog.types';

function ConfirmDialogConfirmView({
  title,
  description,
  ConfirmIcon,
  confirmLabel,
  cancelLabel,
  retryLabel,
  failure,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmDialogConfirmViewProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {failure?.transient && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{failure.message}</span>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
          <ConfirmIcon aria-hidden="true" />
          {failure?.transient ? retryLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogConfirmView };
