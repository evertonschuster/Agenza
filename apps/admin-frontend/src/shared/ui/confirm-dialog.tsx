import * as React from 'react';
import { AlertCircleIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';

interface ConfirmDialogFailure {
  message: string;
  transient: boolean;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmIcon: LucideIcon;
  blockedTitle: string;
  failure?: ConfirmDialogFailure | undefined;
  cancelLabel?: string;
  retryLabel?: string;
  dismissLabel?: string;
}

function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title,
  description,
  confirmLabel,
  confirmIcon: ConfirmIcon,
  blockedTitle,
  failure,
  cancelLabel = 'Cancelar',
  retryLabel = 'Tentar novamente',
  dismissLabel = 'Entendi',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {failure && !failure.transient ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircleIcon aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle>{blockedTitle}</DialogTitle>
              <DialogDescription>{failure.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {dismissLabel}
              </Button>
            </DialogFooter>
          </>
        ) : (
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
                <ConfirmIcon aria-hidden="true" />
                {failure?.transient ? retryLabel : confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps, ConfirmDialogFailure };
