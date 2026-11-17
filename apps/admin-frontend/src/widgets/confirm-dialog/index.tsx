import { useEffect, useRef, useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { isTransientProblem, type ApiProblem } from '@/shared/api/servicesFacade';
import { toast } from '@/shared/ui/toast';
import type { ConfirmDialogProps } from './confirm-dialog.types';

import { ConfirmDialogBlockedView } from './components/confirm-dialog-blocked-view';
import { ConfirmDialogConfirmView } from './components/confirm-dialog-confirm-view';

function ConfirmDialog<T>({
  loading = false,
  onOpenChange,
  onConfirm,
  onSuccess,
  confirmation: {
    title = 'Confirmar exclusão?',
    description = 'Essa ação não pode ser desfeita.',
    icon: ConfirmIcon = Trash2Icon,
    confirmLabel = 'Excluir',
    confirmVariant = 'destructive',
    cancelLabel = 'Cancelar',
  },
  error: {
    blockedTitle = 'Não é possível excluir',
    retryLabel = 'Tentar novamente',
    dismissLabel = 'Entendi',
    canRetryBlocked,
    blockedRetryLabel = 'Tentar novamente',
  } = {},
  success: {
    title: successTitle = 'Excluído com sucesso',
    description: successDescription = 'A operação foi concluída.',
  } = {},
}: ConfirmDialogProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problem, setProblem] = useState<ApiProblem>();
  const isMountedRef = useRef(true);
  const isBlocked = problem !== undefined && !isTransientProblem(problem);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleConfirm() {
    if (!isBlocked) setProblem(undefined);
    setIsSubmitting(true);
    const result = await onConfirm();
    setIsSubmitting(false);

    if (result.ok) {
      toast.add({ title: successTitle, description: successDescription, type: 'success' });
      onSuccess?.(result.data);
      if (isMountedRef.current) onOpenChange(false);
      return;
    }

    setProblem(result.error);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
    >
      <DialogContent
        showCloseButton={!isSubmitting}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {isBlocked ? (
          <ConfirmDialogBlockedView
            blockedTitle={blockedTitle}
            problem={problem}
            dismissLabel={dismissLabel}
            retryLabel={canRetryBlocked?.(problem) ? blockedRetryLabel : undefined}
            isSubmitting={isSubmitting}
            onRetry={() => void handleConfirm()}
          />
        ) : (
          <ConfirmDialogConfirmView
            title={title}
            description={description}
            ConfirmIcon={ConfirmIcon}
            confirmLabel={confirmLabel}
            confirmVariant={confirmVariant}
            cancelLabel={cancelLabel}
            retryLabel={retryLabel}
            failure={problem}
            loading={loading}
            isSubmitting={isSubmitting}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
