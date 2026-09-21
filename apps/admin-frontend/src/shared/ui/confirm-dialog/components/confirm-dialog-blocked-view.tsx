import { AlertCircleIcon } from 'lucide-react';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import type { ConfirmDialogBlockedViewProps } from '../confirm-dialog.types';

function ConfirmDialogBlockedView({
  blockedTitle,
  message,
  dismissLabel,
  onDismiss,
}: ConfirmDialogBlockedViewProps) {
  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircleIcon aria-hidden="true" className="size-5" />
        </div>
        <DialogTitle>{blockedTitle}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialogBlockedView };
