import { AlertCircleIcon } from 'lucide-react';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ConfirmDialogConfirmViewProps } from '../confirm-dialog.types';

function ConfirmDialogConfirmView({
  title,
  description,
  ConfirmIcon,
  confirmLabel,
  cancelLabel,
  retryLabel,
  failure,
  loading,
  isSubmitting,
  shortcutId,
  onConfirm,
}: ConfirmDialogConfirmViewProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {loading ? (
          <div role="status" className="space-y-2">
            <span className="sr-only">Carregando…</span>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <DialogDescription>{description}</DialogDescription>
        )}
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
        <DialogClose disabled={isSubmitting} render={<Button variant="outline" />}>
          {cancelLabel}
        </DialogClose>
        <ActionButton
          variant="destructive"
          icon={ConfirmIcon}
          disabled={loading}
          pending={isSubmitting}
          shortcutId={shortcutId}
          onClick={onConfirm}
        >
          {failure?.transient ? retryLabel : confirmLabel}
        </ActionButton>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogConfirmView };
