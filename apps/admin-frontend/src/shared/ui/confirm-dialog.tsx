import { useState, type ReactNode } from 'react';
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
import { toast } from './toast';

interface ConfirmDialogFailure {
  message: string;
  transient: boolean;
}

interface ConfirmDialogConfirmation {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  label?: string;
  cancelLabel?: string;
}

interface ConfirmDialogError {
  title?: string;
  retryLabel?: string;
  dismissLabel?: string;
}

interface ConfirmDialogSuccess {
  title?: string;
  description: string;
}

interface ConfirmDialogProps<T> {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<T>>;
  onConfirmed?: (data: T) => void;
  confirmation: ConfirmDialogConfirmation;
  error?: ConfirmDialogError;
  success?: ConfirmDialogSuccess;
}

function ConfirmDialog<T>({
  onOpenChange,
  onConfirm,
  onConfirmed,
  confirmation: {
    title,
    description,
    icon: ConfirmIcon,
    label: confirmLabel = 'Excluir',
    cancelLabel = 'Cancelar',
  },
  error: {
    title: blockedTitle = 'Não é possível excluir',
    retryLabel = 'Tentar novamente',
    dismissLabel = 'Entendi',
  } = {},
  success,
}: ConfirmDialogProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<ConfirmDialogFailure>();

  async function handleConfirm() {
    setIsSubmitting(true);
    const result = await onConfirm();
    setIsSubmitting(false);

    if (result.ok) {
      if (success) {
        toast.add({
          title: success.title ?? 'Excluído com sucesso',
          description: success.description,
          type: 'success',
        });
      }
      onConfirmed?.(result.data);
      onOpenChange(false);
      return;
    }

    setFailure({
      message: extractErrorMessage(result.error),
      transient: isTransientProblem(result.error),
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
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
              <Button
                variant="destructive"
                onClick={() => void handleConfirm()}
                disabled={isSubmitting}
              >
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
