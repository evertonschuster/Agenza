import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { extractErrorMessage, isTransientProblem } from '../../api/servicesFacade';
import { toast } from '../toast';
import type { ConfirmDialogProps, ConfirmDialogFailure } from './confirm-dialog.types';

import { ConfirmDialogBlockedView } from './components/confirm-dialog-blocked-view';
import { ConfirmDialogConfirmView } from './components/confirm-dialog-confirm-view';

const CONFIRM_SHORTCUT_ID = 'confirm-dialog-confirm';

function ConfirmDialog<T>({
  onOpenChange,
  onConfirm,
  onSuccess,
  confirmation: {
    title = 'Confirmar exclusão?',
    description = 'Essa ação não pode ser desfeita.',
    icon: ConfirmIcon = Trash2Icon,
    confirmLabel = 'Excluir',
    cancelLabel = 'Cancelar',
  },
  error: {
    blockedTitle = 'Não é possível excluir',
    retryLabel = 'Tentar novamente',
    dismissLabel = 'Entendi',
  } = {},
  success: {
    title: successTitle = 'Excluído com sucesso',
    description: successDescription = 'A operação foi concluída.',
  } = {},
}: ConfirmDialogProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<ConfirmDialogFailure>();
  const isBlocked = failure !== undefined && !failure.transient;

  async function handleConfirm() {
    setIsSubmitting(true);
    const result = await onConfirm();
    setIsSubmitting(false);

    if (result.ok) {
      toast.add({ title: successTitle, description: successDescription, type: 'success' });
      onSuccess?.(result.data);
      onOpenChange(false);
      return;
    }

    setFailure({
      message: extractErrorMessage(result.error),
      transient: isTransientProblem(result.error),
    });
  }

  useShortcut(
    CONFIRM_SHORTCUT_ID,
    'Delete',
    confirmLabel,
    () => {
      if (!isSubmitting && !isBlocked) void handleConfirm();
    },
    { modified: true },
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
    >
      <DialogContent showCloseButton={!isSubmitting}>
        {isBlocked ? (
          <ConfirmDialogBlockedView
            blockedTitle={blockedTitle}
            message={failure.message}
            dismissLabel={dismissLabel}
          />
        ) : (
          <ConfirmDialogConfirmView
            title={title}
            description={description}
            ConfirmIcon={ConfirmIcon}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            retryLabel={retryLabel}
            failure={failure}
            isSubmitting={isSubmitting}
            shortcutId={CONFIRM_SHORTCUT_ID}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps, ConfirmDialogFailure };
