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
import { extractErrorMessage, isTransientProblem, type ApiResult } from '../api/servicesFacade';
import { useState } from 'react';
import { toast } from './toast';

interface ConfirmDialogFailure {
  message: string;
  transient: boolean;
}

interface ConfirmDialogProps {
  onOpenChange: (open: boolean) => void;
  onConfirm: <T>(this: void) => Promise<ApiResult<T>>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  confirmIcon: LucideIcon;
  blockedTitle: string;
  cancelLabel?: string;
  retryLabel?: string;
  dismissLabel?: string;
}

function ConfirmDialog({
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmIcon: ConfirmIcon,
  blockedTitle,
  confirmLabel = "Excluir",
  cancelLabel = 'Cancelar',
  retryLabel = 'Tentar novamente',
  dismissLabel = 'Entendi',
}: ConfirmDialogProps) {


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<ConfirmDialogFailure>();


  function handleConfirm() {
    setIsSubmitting(true);
    onConfirm()
      .then(result => {

        setIsSubmitting(false);

        if (result.ok) {
          toast.add({
            title: 'Etiqueta excluída',
            description: `"${"Todo"}" foi removida do catálogo.`,
            type: 'success',
          });
          onOpenChange(false);
          return;
        }

        setFailure({
          message: extractErrorMessage(result.error),
          transient: isTransientProblem(result.error),
        });
      })
      .catch((error: unknown) => {
        setIsSubmitting(false);
        const message = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
        setFailure({
          message,
          transient: true,
        });
      });
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
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
              <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
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
