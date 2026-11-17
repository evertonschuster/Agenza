import { Trash2Icon } from 'lucide-react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import type { ConfirmDialogProps } from './confirm-dialog.types';
import { useConfirmDialog } from './use-confirm-dialog';

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
    blockedRetryLabel = 'Tentar novamente',
  } = {},
  success: {
    title: successTitle = 'Excluído com sucesso',
    description: successDescription = 'A operação foi concluída.',
  } = {},
}: ConfirmDialogProps<T>) {
  const { isSubmitting, problem, isBlocked, blockedRetries, handleConfirm } = useConfirmDialog({
    onConfirm,
    onOpenChange,
    onSuccess,
    successTitle,
    successDescription,
  });

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
        {isBlocked && problem ? (
          <ConfirmDialogBlockedView
            blockedTitle={blockedTitle}
            problem={problem}
            dismissLabel={dismissLabel}
            retryLabel={blockedRetryLabel.trim() || 'Tentar novamente'}
            retryVariant={confirmVariant}
            isSubmitting={isSubmitting}
            completedRetries={blockedRetries}
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
